"use client";

import { create } from "zustand";
import { DEFAULT_THEME, type ThemeId } from "./themes";
import { setLevel, setMusic, stopAll } from "@/audio/mixer";
import { setMasterVolume } from "@/audio/engine";
import type { DeckMode } from "@/audio/lofi/engine";
import { PRESETS, SOUND_BY_ID, type Preset } from "@/audio/catalogue";

const KEY = "dhvani.state.v1";

/**
 * Says what just happened, for anyone who cannot see it happen.
 *
 * Toggling a sound changes a card's colour and starts a fade; neither is
 * perceivable without sight, so nothing at all was being reported.
 */
export function announce(message: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("dhvani-live");
  if (el) el.textContent = message;
}

function levelMessage(id: string, level: number, levels: Record<string, number>) {
  const name = SOUND_BY_ID[id]?.name ?? id;
  const n = Object.keys(levels).length;
  if (level <= 0) return `${name} off. ${n} playing.`;
  return `${name} on at ${Math.round(level * 100)} percent. ${n} playing.`;
}

type Persisted = {
  theme: ThemeId;
  master: number;
  levels: Record<string, number>;
  music: { mode: DeckMode; level: number } | null;
};

type State = Persisted & {
  /** True once the user has made the gesture that starts audio. */
  awake: boolean;
  /** Minutes remaining on the sleep timer, or null. */
  timerEndsAt: number | null;
  wake(): void;
  setTheme(t: ThemeId): void;
  setMaster(v: number): void;
  setSound(id: string, level: number): void;
  setMusicMode(mode: DeckMode | null): void;
  setMusicLevel(v: number): void;
  applyPreset(p: Preset): void;
  clear(): void;
  setTimer(minutes: number | null): void;
};

function load(): Partial<Persisted> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Persisted | null = null;

/**
 * Trailing-debounced persistence.
 *
 * A slider drag fires sixty to a hundred change events a second, and each one
 * used to stringify and write the whole state synchronously. It is cheap at
 * this payload size, but it is on the interaction path and it has no business
 * being there.
 */
function save(s: Persisted) {
  if (typeof window === "undefined") return;
  pending = s;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const v = pending;
    pending = null;
    if (!v) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ theme: v.theme, master: v.master, levels: v.levels, music: v.music }),
      );
    } catch {
      /* private mode, quota, whatever. Not worth breaking playback over. */
    }
  }, 400);
}

export const useDhvani = create<State>((set, get) => ({
  theme: DEFAULT_THEME,
  master: 0.8,
  levels: {},
  music: null,
  awake: false,
  timerEndsAt: null,

  wake() {
    if (get().awake) return;
    set({ awake: true });
    // Restore whatever was playing when they closed the tab.
    const s = get();
    setMasterVolume(s.master);
    for (const [id, v] of Object.entries(s.levels)) if (v > 0) void setLevel(id, v);
    if (s.music) void setMusic(s.music.mode, s.music.level);
  },

  setTheme(theme) {
    set({ theme });
    save({ ...get(), theme });
  },

  setMaster(master) {
    set({ master });
    if (get().awake) setMasterVolume(master);
    save({ ...get(), master });
  },

  setSound(id, level) {
    const levels = { ...get().levels };
    if (level <= 0) delete levels[id];
    else levels[id] = level;
    // wake() replays every stored level, so it has to run against the state
    // BEFORE this change; otherwise the sound just clicked is started twice,
    // once by wake and once below, racing through the same await.
    get().wake();
    set({ levels });
    void setLevel(id, level);
    save({ ...get(), levels });
    announce(levelMessage(id, level, levels));
  },

  setMusicMode(mode) {
    if (!mode) {
      set({ music: null });
      void setMusic(null, 0);
      save({ ...get(), music: null });
      return;
    }
    const level = get().music?.level ?? 0.5;
    const music = { mode, level };
    set({ music });
    get().wake();
    void setMusic(mode, level);
    save({ ...get(), music });
  },

  setMusicLevel(level) {
    const cur = get().music;
    if (!cur) return;
    const music = { ...cur, level };
    set({ music });
    void setMusic(music.mode, level);
    save({ ...get(), music });
  },

  applyPreset(p) {
    get().wake();
    announce(`${p.name} preset applied.`);
    // Everything not in the preset fades out, so presets replace rather than pile up.
    for (const id of Object.keys(get().levels)) {
      if (!(id in p.mix)) void setLevel(id, 0);
    }
    for (const [id, v] of Object.entries(p.mix)) void setLevel(id, v);
    const music = p.lofi?.on ? { mode: "lofi" as DeckMode, level: p.lofi.level } : null;
    void setMusic(music?.mode ?? null, music?.level ?? 0);
    const theme = p.theme ?? get().theme;
    set({ levels: { ...p.mix }, music, theme });
    save({ ...get(), levels: { ...p.mix }, music, theme });
  },

  clear() {
    announce("All sounds stopped.");
    stopAll();
    void setMusic(null, 0);
    set({ levels: {}, music: null });
    save({ ...get(), levels: {}, music: null });
  },

  setTimer(minutes) {
    set({ timerEndsAt: minutes === null ? null : Date.now() + minutes * 60_000 });
  },
}));

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  // Lets the whole mixer be driven from the console while developing.
  (window as unknown as { __dhvaniStore?: unknown }).__dhvaniStore = useDhvani;
}

/** Called once on the client to pull persisted state in without a hydration mismatch. */
export function hydrateStore() {
  const p = load();
  useDhvani.setState({
    theme: p.theme ?? DEFAULT_THEME,
    master: p.master ?? 0.8,
    levels: p.levels ?? {},
    music: p.music ?? null,
  });
}

export { PRESETS };

"use client";

import { create } from "zustand";
import { DEFAULT_THEME, type ThemeId } from "./themes";
import { setLevel, setMusic, stopAll } from "@/audio/mixer";
import { setMasterVolume } from "@/audio/engine";
import type { DeckMode } from "@/audio/lofi/engine";
import { PRESETS, type Preset } from "@/audio/catalogue";

const KEY = "dhvani.state.v1";

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
  toggleSound(id: string): void;
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

function save(s: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme: s.theme, master: s.master, levels: s.levels, music: s.music }),
    );
  } catch {
    /* private mode, quota, whatever. Not worth breaking playback over. */
  }
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
    set({ levels });
    get().wake();
    void setLevel(id, level);
    save({ ...get(), levels });
  },

  toggleSound(id) {
    const cur = get().levels[id] ?? 0;
    get().setSound(id, cur > 0 ? 0 : 0.5);
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

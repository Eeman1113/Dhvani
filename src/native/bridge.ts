/**
 * The audio engine with no page around it, for the macOS app.
 *
 * The Mac app draws its own interface natively and keeps its own state, but
 * every sound is still made here, by exactly the code the website runs. This
 * file is the whole contract between the two: the app calls `window.dhvani.*`
 * through evaluateJavaScript, and hears back through one message handler.
 *
 * Built by scripts/build-mac.mjs into macos/Dhvani/Resources/Engine.
 */

import { setLevel, setMusic, stopAll, musicNowPlaying, rerollMusic } from "@/audio/mixer";
import { getContext, getMaster, ramp, resume, clamp01 } from "@/audio/engine";
import type { DeckMode } from "@/audio/lofi/engine";

type Outgoing =
  | { type: "ready" }
  | { type: "status"; state: string; nowPlaying: ReturnType<typeof musicNowPlaying> }
  | { type: "error"; message: string };

type Handler = { postMessage(m: Outgoing): void };

function post(m: Outgoing) {
  const h = (window as unknown as { webkit?: { messageHandlers?: { dhvani?: Handler } } })
    .webkit?.messageHandlers?.dhvani;
  h?.postMessage(m);
}

let master = 0.8;
let paused = false;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

/** The master as the listener hears it: zero while paused. */
function applyMaster(seconds: number) {
  ramp(getMaster().gain, paused ? 0 : clamp01(master), seconds);
}

const api = {
  setLevel(id: string, level: number) {
    void setLevel(id, level);
  },

  setMusic(mode: DeckMode | null, level: number) {
    void setMusic(mode, level);
  },

  rerollMusic() {
    rerollMusic();
  },

  setMaster(v: number) {
    master = v;
    applyMaster(0.08);
  },

  stopAll() {
    stopAll();
    void setMusic(null, 0);
  },

  /**
   * Fade to silence, then suspend the context.
   *
   * Suspending stops the audio hardware outright, so a paused Dhvani costs no
   * CPU at all. Every voice keeps its state, and play picks up where it left.
   */
  pause(fadeSeconds = 0.6) {
    paused = true;
    applyMaster(fadeSeconds);
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      if (paused) void getContext().suspend();
    }, fadeSeconds * 1000 + 120);
  },

  async play(fadeSeconds = 0.6) {
    paused = false;
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
    await resume();
    applyMaster(fadeSeconds);
  },
};

(window as unknown as { dhvani: typeof api }).dhvani = api;

window.addEventListener("error", (e) => post({ type: "error", message: String(e.message) }));
window.addEventListener("unhandledrejection", (e) =>
  post({ type: "error", message: String((e as PromiseRejectionEvent).reason) }),
);

// Once a second is plenty for a key, a tempo and whether the context is alive.
setInterval(() => {
  post({ type: "status", state: getContext().state, nowPlaying: musicNowPlaying() });
}, 1000);

post({ type: "ready" });

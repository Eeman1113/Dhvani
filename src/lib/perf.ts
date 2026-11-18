"use client";

import { useSyncExternalStore } from "react";

/**
 * Rendering tiers.
 *
 * Dhvani draws a lot: around a hundred hand-drawn borders redrawn three times
 * a second, a few hundred SMIL animations inside the doodles, a full viewport
 * particle canvas, and six parallaxed painted layers under a filter. On a
 * machine with GPU acceleration switched off, all of that lands on one CPU
 * core, and it does not merely look choppy: it starves the main thread badly
 * enough that the Web Audio scheduler misses its lookahead window and the
 * music stops. The decoration is not worth the thing the app is for.
 *
 * So there are two tiers. The audio engine is IDENTICAL in both, deliberately
 * and permanently: every sound, every music mode, every preset. Lite only
 * stops drawing so much.
 */

export type Tier = "full" | "lite";

const KEY = "dhvani.tier.v1";
const ASKED = "dhvani.tier.asked.v1";

type State = {
  tier: Tier;
  /** True when we have measured a struggling machine and not yet asked. */
  shouldOffer: boolean;
  /** The measured frame interval that triggered the offer, for honesty in the copy. */
  measuredFps: number | null;
};

let state: State = { tier: "full", shouldOffer: false, measuredFps: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  applyToDocument();
  emit();
}

function applyToDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.perf = state.tier;
}

export function getTier(): Tier {
  return state.tier;
}

export function setTier(tier: Tier, remember = true) {
  if (remember && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, tier);
    } catch {
      /* private mode */
    }
  }
  set({ tier, shouldOffer: false });
}

export function dismissOffer() {
  try {
    localStorage.setItem(ASKED, "1");
  } catch {
    /* private mode */
  }
  set({ shouldOffer: false });
}

/* ------------------------------------------------------------------ */
/* detection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Static hints, read before anything has been drawn.
 *
 * These are weak on their own (a fast machine can report four cores) so they
 * are only used to start in lite when the signal is unambiguous, and
 * otherwise to lower the bar for the measured check below.
 */
function hardwareSuspicion(): number {
  if (typeof navigator === "undefined") return 0;
  let score = 0;

  const cores = navigator.hardwareConcurrency ?? 8;
  if (cores <= 2) score += 2;
  else if (cores <= 4) score += 1;

  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 4) score += 1;

  // No WebGL almost always means no GPU compositing either, which is the
  // single worst case for this page: every filter, blur and opacity
  // animation falls back to the CPU.
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) score += 3;
  } catch {
    score += 3;
  }

  return score;
}

/**
 * Watches real frames and decides whether this machine is coping.
 *
 * Deliberately measured rather than sniffed: the only thing that matters is
 * whether frames are actually landing on time on this machine, in this
 * window, with this mix playing.
 */
export function startWatching() {
  if (typeof window === "undefined") return;

  /*
   * An override in the URL, which beats everything.
   *
   *   ?draw=lite   force lite mode (?draw=light also accepted)
   *   ?draw=full   force the full drawing
   *   ?draw=ask    show the offer now
   *
   * Worth having so the light version can be linked to directly, and so the
   * offer can be seen on a machine fast enough that it would never appear.
   */
  const forced = new URLSearchParams(window.location.search).get("draw");
  if (forced === "light" || forced === "lite") {
    setTier("lite");
    return;
  }
  if (forced === "full") {
    setTier("full");
    return;
  }
  if (forced === "ask") {
    applyToDocument();
    set({ shouldOffer: true, measuredFps: null });
    return;
  }

  // An explicit choice always wins and is never second-guessed.
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (stored === "lite" || stored === "full") {
    set({ tier: stored });
    return;
  }

  const suspicion = hardwareSuspicion();
  if (suspicion >= 4) {
    // Unambiguous: no GPU and few cores. Start light rather than showing a
    // janky page first and then asking about it.
    set({ tier: "lite" });
    return;
  }

  applyToDocument();

  let asked = false;
  try {
    asked = localStorage.getItem(ASKED) === "1";
  } catch {
    /* private mode */
  }
  if (asked) return;

  // Let the first paint and font swap settle before judging anything.
  const WARMUP_MS = 1800;
  const WINDOW_MS = 4000;
  const frames: number[] = [];
  let last = 0;
  let raf = 0;
  let stop = 0;

  const tick = (now: number) => {
    if (!stop) stop = now + WINDOW_MS;
    if (last) frames.push(now - last);
    last = now;
    if (now < stop) {
      raf = requestAnimationFrame(tick);
      return;
    }

    if (frames.length < 10) return;
    frames.sort((a, b) => a - b);
    const median = frames[Math.floor(frames.length / 2)];
    // The 90th percentile catches a page that mostly copes and then hitches,
    // which is exactly what starves the audio scheduler.
    const p90 = frames[Math.floor(frames.length * 0.9)];
    const fps = Math.round(1000 / median);

    // A 60 Hz frame is 16.7 ms. 28 ms median is about 36 fps, which is where
    // this page stops feeling like paper and starts feeling like software.
    const slow = median > 28 || p90 > 90 || (suspicion >= 2 && median > 22);
    if (slow) set({ shouldOffer: true, measuredFps: fps });
  };

  const warm = setTimeout(() => {
    raf = requestAnimationFrame(tick);
  }, WARMUP_MS);

  return () => {
    clearTimeout(warm);
    if (raf) cancelAnimationFrame(raf);
  };
}

/* ------------------------------------------------------------------ */

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTier(): Tier {
  return useSyncExternalStore(
    subscribe,
    () => state.tier,
    () => "full" as Tier,
  );
}

export function useLite(): boolean {
  return useTier() === "lite";
}

export function usePerfOffer() {
  return useSyncExternalStore(
    subscribe,
    () => state.shouldOffer,
    () => false,
  );
}

export function useMeasuredFps() {
  return useSyncExternalStore(
    subscribe,
    () => state.measuredFps,
    () => null,
  );
}

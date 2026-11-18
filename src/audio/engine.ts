/**
 * The single AudioContext for the whole app, plus the master chain.
 *
 * Dhvani is meant to run for hours, so a few rules hold everywhere in
 * src/audio:
 *
 *  1. Nothing is created until the user's first gesture. Browsers will not let
 *     an AudioContext start before then, and a suspended context silently
 *     swallows every scheduled event.
 *  2. Every gain change is a ramp, never an assignment. Assigning to .value
 *     mid-stream produces a click, and a click every time you nudge a slider
 *     is unbearable over a four-hour session.
 *  3. Anything that creates nodes on a timer must disconnect them on `ended`.
 *     A campfire creates a few crackles a second; over four hours that is a
 *     hundred thousand nodes, and the graph will not garbage-collect nodes
 *     that are still connected.
 */

export type Levels = {
  /** 0..1 energy below ~200 Hz — thunder, kick, waves. */
  bass: number;
  /** 0..1 energy ~200 Hz–2 kHz — voices, rhodes, body. */
  mid: number;
  /** 0..1 energy above ~2 kHz — rain, crackle, hats. */
  air: number;
  /** 0..1 overall loudness, smoothed. */
  rms: number;
  /** Rises sharply on a transient, decays slowly. Drives the bouncing. */
  hit: number;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let analyser: AnalyserNode | null = null;
let freqData: Uint8Array<ArrayBuffer> | null = null;

/** Mutated in place every frame; read by the visual layer. Never replaced. */
export const levels: Levels = { bass: 0, mid: 0, air: 0, rms: 0, hit: 0 };

export function isStarted() {
  return ctx !== null;
}

/** Idempotent. Safe to call from any user gesture. */
export function getContext(): AudioContext {
  if (ctx) return ctx;

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  ctx = new Ctor({ latencyHint: "playback" });

  master = ctx.createGain();
  master.gain.value = 0.9;

  // Not a real brickwall, but it keeps a ten-source mix from clipping when the
  // user stacks rain + thunder + lofi and then pushes everything to full.
  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 12;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.18;

  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  freqData = new Uint8Array(analyser.frequencyBinCount);

  master.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(ctx.destination);

  if (process.env.NODE_ENV !== "production") {
    // Handle for measuring voices from the console during development.
    (window as unknown as { __dhvani?: unknown }).__dhvani = {
      ctx,
      master,
      analyser,
      levels,
    };
  }

  return ctx;
}

export function getMaster(): GainNode {
  getContext();
  return master!;
}

export function getAnalyser(): AnalyserNode {
  getContext();
  return analyser!;
}

export async function resume() {
  const c = getContext();
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      /* the next gesture will try again */
    }
  }
}

export function setMasterVolume(v: number) {
  const c = getContext();
  ramp(master!.gain, clamp01(v), 0.08);
  void c;
}

/* ------------------------------------------------------------------ */
/* small shared helpers used all over the synthesis code               */
/* ------------------------------------------------------------------ */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Click-free parameter move. The only way gains are allowed to change. */
export function ramp(p: AudioParam, value: number, seconds = 0.05) {
  const c = getContext();
  const t = c.currentTime;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  // setTargetAtTime is exponential and never quite arrives, which is exactly
  // what you want for a fader; linearRamp at tiny values is what clicks.
  p.linearRampToValueAtTime(value, t + seconds);
}

/** Perceptual fader curve. Linear gain sliders feel dead in the bottom half. */
export function faderToGain(v: number) {
  const x = clamp01(v);
  return x * x;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * (b - a + 1));
export const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------------------------------------------ */
/* analysis loop                                                       */
/* ------------------------------------------------------------------ */

let rafId = 0;
let lastRms = 0;

type Sub = (l: Levels, dt: number) => void;
const subs = new Set<Sub>();

/**
 * One rAF loop for the entire app. Visual components register a callback and
 * mutate the DOM directly from it. Nothing here touches React state — a
 * 60 fps setState would melt a laptop long before hour four.
 */
export function subscribeFrame(fn: Sub): () => void {
  subs.add(fn);
  startLoop();
  return () => {
    subs.delete(fn);
  };
}

function startLoop() {
  if (rafId) return;
  let prev = performance.now();

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      const n = freqData.length;
      const sr = ctx!.sampleRate;
      const binHz = sr / 2 / n;
      const idx = (hz: number) => Math.min(n - 1, Math.round(hz / binHz));

      levels.bass = band(freqData, idx(20), idx(200));
      levels.mid = band(freqData, idx(200), idx(2000));
      levels.air = band(freqData, idx(2000), idx(12000));

      const r = (levels.bass * 1.1 + levels.mid + levels.air * 0.8) / 2.9;
      // Asymmetric smoothing: follow a rise quickly, fall away slowly, so the
      // doodles feel like they have weight instead of jittering.
      levels.rms += (r - levels.rms) * (r > levels.rms ? 0.35 : 0.06);

      const delta = levels.rms - lastRms;
      lastRms = levels.rms;
      if (delta > 0.035) levels.hit = Math.min(1, levels.hit + delta * 6);
      levels.hit *= 0.90;
    } else {
      // Before audio starts, breathe gently so the page is never dead.
      const t = now / 1000;
      levels.rms = 0.12 + Math.sin(t * 0.6) * 0.04;
      levels.mid = levels.rms;
      levels.bass = levels.rms * 0.6;
      levels.air = levels.rms * 0.4;
      levels.hit *= 0.92;
    }

    for (const fn of subs) fn(levels, dt);
  };

  rafId = requestAnimationFrame(tick);
}

function band(data: Uint8Array, from: number, to: number) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += data[i];
  const avg = sum / Math.max(1, to - from) / 255;
  return clamp01(avg * 1.35);
}

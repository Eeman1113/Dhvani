/**
 * The scheduling clock.
 *
 * Fire crackles, rain droplets, thunder, chimes and every lofi note are
 * sporadic events that have to keep their timing when the tab is in the
 * background — which is where this app spends most of its life, because the
 * whole point is that you put it on and then go and work.
 *
 * Browsers throttle setTimeout/setInterval in hidden tabs to roughly 1 Hz.
 * The fix is not to fight the throttle but to make it irrelevant: every voice
 * schedules its events into a *window of AudioContext time* that runs ahead of
 * the clock. Even if the tick only fires once a second, the window is always
 * already filled, and the audio hardware plays it out with sample accuracy.
 *
 * The ticker runs in a Worker because a Worker's timers survive the tab being
 * hidden far better than the page's do.
 */

import { getContext } from "./engine";

/** Fill events into [from, to). Both are AudioContext timestamps, seconds. */
export type Filler = (from: number, to: number) => void;

/**
 * Seconds of future kept filled.
 *
 * The worker ticker is immune to timer throttling but the fill itself still
 * runs on the main thread, because that is where the AudioContext lives. So
 * the window has to be wide enough to ride out a long React commit or a GC
 * pause; anything longer than this is not a backlog, it is a silent hole in
 * every voice at once.
 *
 * Eight seconds, because on a machine with no GPU acceleration a single
 * frame of this page can take most of a second, and a run of them can take
 * several. Measured: at ninety percent main-thread occupancy a four second
 * window already held, but it left nothing spare, and the first report of
 * the music stopping came from exactly that machine. The cost of a wider
 * window is only that a fader change takes slightly longer to be heard.
 */
const LOOKAHEAD = 8.0;
const TICK_MS = 120;

const fillers = new Set<Filler>();
const reported = new WeakSet<Filler>();
let worker: Worker | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let filledUntil = 0;

const WORKER_SRC = `
let id = null;
self.onmessage = (e) => {
  if (e.data.cmd === 'start') {
    if (id !== null) clearInterval(id);
    id = setInterval(() => self.postMessage('tick'), e.data.ms);
  } else if (e.data.cmd === 'stop') {
    if (id !== null) clearInterval(id);
    id = null;
  }
};
`;

function ensureTicker() {
  if (worker || fallbackTimer) return;
  try {
    const url = URL.createObjectURL(
      new Blob([WORKER_SRC], { type: "application/javascript" }),
    );
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = tick;
    worker.postMessage({ cmd: "start", ms: TICK_MS });
  } catch {
    // Some locked-down environments refuse blob workers. Timing degrades in a
    // hidden tab but the app still works.
    fallbackTimer = setInterval(tick, TICK_MS);
  }
}

function tick() {
  if (fillers.size === 0) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const target = now + LOOKAHEAD;

  // A suspended/resumed context, or a laptop waking from sleep, can leave
  // filledUntil far in the past. Snapping forward avoids a burst of hours of
  // backlogged crackles arriving all at once.
  if (filledUntil < now || filledUntil > target + LOOKAHEAD) filledUntil = now;
  if (target <= filledUntil) return;

  const from = filledUntil;
  filledUntil = target;
  for (const f of fillers) {
    try {
      f(from, target);
    } catch (err) {
      // One bad voice must not stop the rest of the mix. But swallowing the
      // error outright makes a scheduling bug look exactly like a silent
      // stall, so it is reported once in any build. Once, because a filler
      // that throws tends to throw every tick.
      if (!reported.has(f)) {
        reported.add(f);
        console.error("[dhvani] a scheduled voice threw and was dropped:", err);
      }
    }
  }
}

export function subscribeClock(f: Filler): () => void {
  fillers.add(f);
  ensureTicker();
  return () => {
    fillers.delete(f);
    // The ticker is deliberately left running. Several voices take no clock
    // subscription at all, so tearing it down on the last unsubscribe meant
    // building a new Blob worker, and eating an unfilled window, every time
    // somebody switched from fire to wind.
  };
}

/**
 * Walks a Poisson process across a time window.
 *
 * `ratePerSecond` events on average, with exponentially distributed gaps —
 * which is what makes a campfire sound like a campfire instead of a metronome.
 * The caller keeps `state.next` between calls so events do not bunch up at
 * window boundaries.
 */
export type PoissonState = { next: number };

export function poisson(
  state: PoissonState,
  from: number,
  to: number,
  ratePerSecond: number,
  emit: (t: number) => void,
  maxPerWindow = 400,
) {
  if (ratePerSecond <= 0) return;
  if (state.next < from) state.next = from;
  let guard = 0;
  while (state.next < to && guard++ < maxPerWindow) {
    emit(state.next);
    state.next += -Math.log(1 - Math.random()) / ratePerSecond;
  }
}

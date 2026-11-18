/**
 * Noise sources.
 *
 * Every ambience in Dhvani is built out of shaped noise, so these buffers are
 * generated once and shared by every voice. They are long (8 s) on purpose:
 * a short looping noise buffer develops an audible pulse within a minute or
 * two, and this app is supposed to be inaudible-as-a-loop for hours.
 */

type NoiseKind = "white" | "pink" | "brown";

const cache = new Map<string, AudioBuffer>();

const LENGTH_SECONDS = 8;

/** The lowest sample rate createBuffer will accept. */
const MIN_BUFFER_RATE = 3000;

export function noiseBuffer(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
  const key = `${kind}:${ctx.sampleRate}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const len = Math.floor(ctx.sampleRate * LENGTH_SECONDS);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    if (kind === "white") {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === "pink") {
      // Paul Kellet's economy pink filter — flat enough to the ear and cheap.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      // Brown = integrated white, with a leak so it cannot wander off to DC.
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }

    // Taper the seam. Even an 8 s loop clicks if the endpoints disagree.
    const fade = Math.floor(ctx.sampleRate * 0.02);
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      d[i] *= g;
      d[len - 1 - i] *= g;
    }
  }

  cache.set(key, buf);
  return buf;
}

/** A looping noise source started at a random offset, so stacked layers never phase-lock. */
export function noiseSource(
  ctx: AudioContext,
  kind: NoiseKind,
  playbackRate = 1,
): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  src.playbackRate.value = playbackRate;
  return src;
}

/** Random start offset inside the buffer. Call when starting the source. */
export function randomOffset(buf: AudioBuffer) {
  return Math.random() * (buf.duration - 0.1);
}

/**
 * A very slow random-walk LFO, as an AudioParam modulator.
 *
 * Wind gusts, fire breathing and wave sets all need motion that is slow and
 * *not* periodic — a plain sine LFO at 0.1 Hz is immediately recognisable as a
 * machine once you have listened to it for ten minutes. This renders a few
 * minutes of smoothed noise and loops it, which reads as genuinely random.
 */
export function slowRandomLfo(
  ctx: AudioContext,
  seconds = 180,
  smoothingHz = 0.12,
): AudioBufferSourceNode {
  const key = `lfo:${seconds}:${smoothingHz}`;
  let buf = cache.get(key);
  // A 200 Hz control signal is plenty for something that moves once every few
  // seconds, and keeps a six-minute LFO down to 144 kB instead of 70 MB. The
  // Web Audio API refuses to create a buffer below 3 kHz, so the samples are
  // stored in a legal buffer and slowed down on playback instead.
  const CONTROL_RATE = 200;
  const rate = CONTROL_RATE;
  if (!buf) {
    const len = Math.floor(rate * seconds);
    buf = ctx.createBuffer(1, len, MIN_BUFFER_RATE);
    const d = buf.getChannelData(0);
    const a = Math.exp((-2 * Math.PI * smoothingHz) / rate);
    let y = 0;
    for (let i = 0; i < len; i++) {
      y = a * y + (1 - a) * (Math.random() * 2 - 1);
      d[i] = y;
    }
    // Normalise — the one-pole costs a lot of amplitude.
    let peak = 1e-6;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < len; i++) d[i] /= peak;
    // Match the ends so the loop point is invisible.
    const fade = Math.floor(rate * 4);
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      d[i] = d[i] * g + d[len - 1 - i] * (1 - g);
    }
    cache.set(key, buf);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.value = CONTROL_RATE / MIN_BUFFER_RATE;
  // Callers with the same (seconds, smoothingHz) share one cached waveform, so
  // without a random phase they all read it from the same place at the same
  // time. Fourteen speakers in a bar would then drift in pitch in perfect
  // unison, which sounds like one detuning voice rather than a room.
  src.loopStart = 0;
  src.loopEnd = buf.duration;
  startAtRandomPhase(src, buf);
  return src;
}

/** Starts a looping source somewhere in the middle of its buffer. */
function startAtRandomPhase(src: AudioBufferSourceNode, buf: AudioBuffer) {
  const offset = Math.random() * buf.duration;
  const start = src.start.bind(src);
  // The call sites all do a bare start(); rebinding keeps them unchanged.
  src.start = ((when?: number) => start(when ?? 0, offset)) as typeof src.start;
}

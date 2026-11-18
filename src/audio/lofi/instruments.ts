/**
 * Synthesised instruments for the music deck.
 *
 * Everything is built from oscillators and filters rather than samples, for the
 * same reason the ambiences are: it never repeats, it weighs nothing, and there
 * is nothing to license. The operatic voice in particular is formant synthesis,
 * which is the old Chowning trick of driving a buzzy source through a bank of
 * fixed resonances and letting the ear hear a throat.
 */

import { rand, pick } from "../engine";
import { noiseBuffer, randomOffset } from "../noise";
import { mtof } from "./theory";

export type Note = {
  midi: number;
  /** AudioContext time. */
  at: number;
  /** Seconds. */
  dur: number;
  /** 0..1 */
  vel: number;
};

type Ctx = { ctx: AudioContext; dest: AudioNode };

/** When an envelope built by env() has finished, relative to its start. */
function envEnd(attack: number, decay: number, release: number, dur: number) {
  return Math.max(dur, attack + decay) + release;
}

function env(
  ctx: AudioContext,
  at: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  dur: number,
  peak: number,
): GainNode {
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0.0001, at);
  p.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  p.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), at + attack + decay);
  p.setValueAtTime(Math.max(0.0002, peak * sustain), at + Math.max(dur, attack + decay));
  p.exponentialRampToValueAtTime(0.0001, at + Math.max(dur, attack + decay) + release);
  return g;
}

function kill(node: AudioScheduledSourceNode, chain: AudioNode[]) {
  node.onended = () => {
    node.disconnect();
    for (const n of chain) n.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* rhodes: the lofi keyboard                                           */
/* ------------------------------------------------------------------ */

/**
 * Two-operator FM. The modulator at the same frequency as the carrier with a
 * fast-decaying index gives the metallic tine attack that softens into a sine,
 * which is more or less exactly how a real Rhodes behaves.
 */
export function rhodes({ ctx, dest }: Ctx, n: Note) {
  const f = mtof(n.midi);
  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = f;

  const mod = ctx.createOscillator();
  mod.type = "sine";
  mod.frequency.value = f * 1.0;

  const modIndex = ctx.createGain();
  const peakIndex = f * (1.6 + n.vel * 2.2);
  modIndex.gain.setValueAtTime(peakIndex, n.at);
  modIndex.gain.exponentialRampToValueAtTime(f * 0.08, n.at + 0.28);

  mod.connect(modIndex).connect(carrier.frequency);

  const amp = env(ctx, n.at, 0.006, 0.5, 0.35, 0.5, n.dur, 0.22 * n.vel);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1800 + n.vel * 2200;
  tone.Q.value = 0.5;

  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.18, 0.18);

  carrier.connect(amp).connect(tone).connect(pan).connect(dest);
  carrier.start(n.at);
  mod.start(n.at);
  const end = n.at + n.dur + 0.6;
  carrier.stop(end);
  mod.stop(end);
  kill(carrier, [amp, tone, pan]);
  mod.onended = () => {
    mod.disconnect();
    modIndex.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* piano: the classical keyboard                                       */
/* ------------------------------------------------------------------ */

export function piano({ ctx, dest }: Ctx, n: Note) {
  const f = mtof(n.midi);
  const pan = ctx.createStereoPanner();
  // Keyboard spread: low notes on the left, as you would hear from the bench.
  pan.pan.value = Math.max(-0.4, Math.min(0.4, (n.midi - 60) / 60));
  pan.connect(dest);

  // The envelope holds until max(dur, attack+decay) and only then releases,
  // so a short Alberti note still rings for over two seconds. Stopping the
  // oscillators at dur+1 cut it mid-sustain and clicked on every note.
  const ATK = 0.004, DEC = 1.4, REL = 0.9;
  const tail = envEnd(ATK, DEC, REL, n.dur) + 0.1;
  const amp = env(ctx, n.at, ATK, DEC, 0.22, REL, n.dur, 0.2 * n.vel);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(3200 + n.vel * 4000, n.at);
  tone.frequency.exponentialRampToValueAtTime(900, n.at + tail);
  amp.connect(tone).connect(pan);

  // Piano partials are stretched sharp by string stiffness. Without the
  // stretch it sounds like an organ.
  const B = 0.0004;
  [1, 2, 3, 4, 5, 6].forEach((k, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * k * Math.sqrt(1 + B * k * k);
    const g = ctx.createGain();
    g.gain.value = (0.9 / (k * k)) * rand(0.8, 1.2);
    o.connect(g).connect(amp);
    o.start(n.at);
    o.stop(n.at + tail);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      // The last partial to finish takes the shared chain with it, so the
      // teardown rides the audio clock instead of a throttled timer.
      if (k === 6) {
        amp.disconnect();
        tone.disconnect();
        pan.disconnect();
      }
    };
    void i;
  });

  // Hammer felt.
  const nb = noiseBuffer(ctx, "white");
  const hs = ctx.createBufferSource();
  hs.buffer = nb;
  const hf = ctx.createBiquadFilter();
  hf.type = "bandpass";
  hf.frequency.value = f * 4;
  hf.Q.value = 1.2;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.03 * n.vel, n.at);
  hg.gain.exponentialRampToValueAtTime(0.0001, n.at + 0.04);
  hs.connect(hf).connect(hg).connect(pan);
  hs.start(n.at, randomOffset(nb), 0.08);
  kill(hs, [hf, hg]);

}

/* ------------------------------------------------------------------ */
/* operatic voice: formant synthesis                                   */
/* ------------------------------------------------------------------ */

/**
 * Formant tables, in Hz / relative gain / bandwidth.
 *
 * These are the classic sung-vowel measurements. A soprano's first formant
 * climbs with pitch, which is why high operatic singing loses its vowel and
 * turns into pure tone; that behaviour is modelled below in `formantShift`.
 */
const VOWELS = {
  ah: [
    [800, 1.0, 80],
    [1150, 0.5, 90],
    [2900, 0.025, 120],
    [3900, 0.1, 130],
    [4950, 0.003, 140],
  ],
  oo: [
    [325, 1.0, 50],
    [700, 0.158, 60],
    [2530, 0.018, 170],
    [3500, 0.01, 180],
    [4950, 0.001, 200],
  ],
  eh: [
    [400, 1.0, 60],
    [1600, 0.251, 80],
    [2700, 0.355, 120],
    [3300, 0.251, 130],
    [4950, 0.126, 140],
  ],
} as const;

export type Vowel = keyof typeof VOWELS;

export function choir(
  { ctx, dest }: Ctx,
  n: Note,
  opts: { vowel?: Vowel; pan?: number; breath?: number } = {},
) {
  const vowel = opts.vowel ?? "ah";
  const f = mtof(n.midi);

  // The glottal source: a sawtooth is a decent stand-in for a glottal pulse
  // train once the formants are doing the real work.
  const src = ctx.createOscillator();
  src.type = "sawtooth";
  src.frequency.value = f;

  // Vibrato, delayed. Singers start a note straight and open the vibrato as
  // they lean into it; starting with vibrato is the single biggest giveaway
  // of a synthetic voice.
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = rand(5.0, 6.2);
  const vibAmt = ctx.createGain();
  vibAmt.gain.setValueAtTime(0.0001, n.at);
  vibAmt.gain.linearRampToValueAtTime(rand(14, 26), n.at + Math.min(0.55, n.dur * 0.45));
  vib.connect(vibAmt).connect(src.detune);

  // A slow drift so unison voices never lock into one another.
  const drift = ctx.createOscillator();
  drift.type = "sine";
  drift.frequency.value = rand(0.08, 0.2);
  const driftAmt = ctx.createGain();
  driftAmt.gain.value = rand(3, 9);
  drift.connect(driftAmt).connect(src.detune);

  const amp = env(ctx, n.at, Math.min(0.35, n.dur * 0.35), 0.3, 0.85, Math.min(1.2, n.dur * 0.7), n.dur, 0.09 * n.vel);
  src.connect(amp);

  const pan = ctx.createStereoPanner();
  pan.pan.value = opts.pan ?? rand(-0.5, 0.5);
  pan.connect(dest);

  // A soprano raises F1 toward the fundamental to stay resonant up high.
  const formantShift = Math.max(1, f / 350);
  // Everything shaped by the formant bank meets here. The ring below has to
  // sit AFTER this sum: a peaking filter passes its whole input and only
  // boosts a band, so hanging it directly off amp would run the raw
  // sawtooth straight into the output and drown the vowel it is shaping.
  const mix = ctx.createGain();
  mix.connect(pan);

  const cleanup: AudioNode[] = [amp, pan, mix];

  for (const [freq, g, bw] of VOWELS[vowel]) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    const cf = Math.min(ctx.sampleRate / 2.2, freq * (freq < 1000 ? formantShift : 1));
    bp.frequency.value = cf * rand(0.985, 1.015);
    bp.Q.value = cf / bw;
    const bg = ctx.createGain();
    bg.gain.value = g;
    amp.connect(bp).connect(bg).connect(mix);
    cleanup.push(bp, bg);
  }

  // The singer's formant: the ring near 2.8 kHz that lets a trained voice
  // carry over an orchestra without amplification.
  //
  // It belongs in parallel with the others, fed from the source, because
  // physically it is one more resonance of the tract (a clustering of the
  // third, fourth and fifth formants), not a tone control on the finished
  // vowel. It also has to be a bandpass: a peaking filter passes its whole
  // input and merely boosts a band, so hanging one off the source ran the
  // raw sawtooth straight to the output and drowned the vowel.
  const ring = ctx.createBiquadFilter();
  ring.type = "bandpass";
  ring.frequency.value = 2850 * rand(0.97, 1.03);
  ring.Q.value = 4.5;
  const ringGain = ctx.createGain();
  ringGain.gain.value = 0.42;
  amp.connect(ring).connect(ringGain).connect(mix);
  cleanup.push(ring, ringGain);

  // Breath.
  const nb = noiseBuffer(ctx, "pink");
  const bs = ctx.createBufferSource();
  bs.buffer = nb;
  bs.loop = true;
  const bf = ctx.createBiquadFilter();
  bf.type = "bandpass";
  bf.frequency.value = 2200;
  bf.Q.value = 0.8;
  const bgn = env(ctx, n.at, 0.12, 0.4, 0.4, 0.5, n.dur, (opts.breath ?? 0.02) * n.vel);
  bs.connect(bf).connect(bgn).connect(pan);
  bs.start(n.at, randomOffset(nb));

  const end = n.at + n.dur + 1.6;
  src.start(n.at);
  vib.start(n.at);
  drift.start(n.at);
  src.stop(end);
  vib.stop(end);
  drift.stop(end);
  bs.stop(end);

  src.onended = () => {
    src.disconnect();
    for (const c of cleanup) c.disconnect();
  };
  vib.onended = () => {
    vib.disconnect();
    vibAmt.disconnect();
    drift.disconnect();
    driftAmt.disconnect();
  };
  bs.onended = () => {
    bs.disconnect();
    bf.disconnect();
    bgn.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* bowed strings                                                       */
/* ------------------------------------------------------------------ */

export function strings({ ctx, dest }: Ctx, n: Note, spread = 3) {
  const f = mtof(n.midi);
  const ATK = Math.min(0.5, n.dur * 0.4);
  const REL = Math.min(1.4, n.dur * 0.6);
  const tail = envEnd(ATK, 0.4, REL, n.dur) + 0.15;
  const amp = env(ctx, n.at, ATK, 0.4, 0.8, REL, n.dur, 0.055 * n.vel);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(900, n.at);
  // The bow digs in as the note settles, opening the tone.
  tone.frequency.linearRampToValueAtTime(2200 + n.vel * 2600, n.at + Math.min(0.9, n.dur * 0.5));
  tone.Q.value = 0.6;

  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.55, 0.55);
  amp.connect(tone).connect(pan).connect(dest);

  for (let i = 0; i < spread; i++) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = (i - (spread - 1) / 2) * rand(5, 13);
    const g = ctx.createGain();
    g.gain.value = 1 / spread;
    // Each player's own slow intonation wobble.
    const v = ctx.createOscillator();
    v.type = "sine";
    v.frequency.value = rand(4.2, 5.8);
    const va = ctx.createGain();
    va.gain.setValueAtTime(0.0001, n.at);
    va.gain.linearRampToValueAtTime(rand(5, 12), n.at + Math.min(0.8, n.dur * 0.6));
    v.connect(va).connect(o.detune);

    o.connect(g).connect(amp);
    o.start(n.at);
    v.start(n.at);
    const end = n.at + tail;
    o.stop(end);
    v.stop(end);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      v.disconnect();
      va.disconnect();
      if (i === spread - 1) {
        amp.disconnect();
        tone.disconnect();
        pan.disconnect();
      }
    };
  }
}

/* ------------------------------------------------------------------ */
/* harp                                                                */
/* ------------------------------------------------------------------ */

export function harp({ ctx, dest }: Ctx, n: Note) {
  const f = mtof(n.midi);
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.max(-0.5, Math.min(0.5, (n.midi - 64) / 40));
  pan.connect(dest);

  const amp = env(ctx, n.at, 0.003, 2.2, 0.05, 1.2, 0.02, 0.14 * n.vel);
  amp.connect(pan);

  const PARTIALS = [1, 2, 3, 4.1, 5.2];
  PARTIALS.forEach((k, idx) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f * k;
    const g = ctx.createGain();
    g.gain.value = 0.8 / (k * 1.5);
    o.connect(g).connect(amp);
    o.start(n.at);
    o.stop(n.at + 3.5);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      if (idx === PARTIALS.length - 1) {
        amp.disconnect();
        pan.disconnect();
      }
    };
  });

  // The nail on the string.
  const nb = noiseBuffer(ctx, "white");
  const s = ctx.createBufferSource();
  s.buffer = nb;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = f * 6;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.025 * n.vel, n.at);
  g.gain.exponentialRampToValueAtTime(0.0001, n.at + 0.03);
  s.connect(bp).connect(g).connect(pan);
  s.start(n.at, randomOffset(nb), 0.06);
  kill(s, [bp, g]);

}

/* ------------------------------------------------------------------ */
/* bass                                                                */
/* ------------------------------------------------------------------ */

export function bass({ ctx, dest }: Ctx, n: Note) {
  const f = mtof(n.midi);
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(f * 1.02, n.at);
  o.frequency.exponentialRampToValueAtTime(f, n.at + 0.04);

  // A quiet octave-up square gives the bass somewhere to be heard on a laptop
  // speaker, which cannot reproduce the fundamental at all.
  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.value = f * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;

  const amp = env(ctx, n.at, 0.012, 0.25, 0.6, 0.18, n.dur, 0.3 * n.vel);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;

  o.connect(amp);
  o2.connect(g2).connect(amp);
  amp.connect(lp).connect(dest);

  const end = n.at + n.dur + 0.3;
  o.start(n.at);
  o2.start(n.at);
  o.stop(end);
  o2.stop(end);
  o.onended = () => {
    o.disconnect();
    amp.disconnect();
    lp.disconnect();
  };
  o2.onended = () => {
    o2.disconnect();
    g2.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* drums                                                               */
/* ------------------------------------------------------------------ */

export function kick({ ctx, dest }: Ctx, at: number, vel = 1) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(125, at);
  o.frequency.exponentialRampToValueAtTime(42, at + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.5 * vel, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + 0.5);
  kill(o, [g]);
}

export function snare({ ctx, dest }: Ctx, at: number, vel = 1) {
  const nb = noiseBuffer(ctx, "white");
  const s = ctx.createBufferSource();
  s.buffer = nb;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1900;
  bp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  // Lofi snares are always dull. The sample was recorded off a cassette and
  // then resampled down, and that is the sound people are expecting.
  lp.frequency.value = 4200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.16 * vel, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  s.connect(bp).connect(lp).connect(g).connect(dest);
  s.start(at, randomOffset(nb), 0.26);
  kill(s, [bp, lp, g]);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(220, at);
  body.frequency.exponentialRampToValueAtTime(150, at + 0.08);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, at);
  bg.gain.exponentialRampToValueAtTime(0.1 * vel, at + 0.005);
  bg.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  body.connect(bg).connect(dest);
  body.start(at);
  body.stop(at + 0.2);
  kill(body, [bg]);
}

export function hat({ ctx, dest }: Ctx, at: number, vel = 1, open = false) {
  const nb = noiseBuffer(ctx, "white");
  const s = ctx.createBufferSource();
  s.buffer = nb;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  // Deliberately lower than a clean hat would be. The tape chain this feeds
  // rolls off just above 8 kHz, so a hat highpassed at the usual 7 k comes out
  // the other side as nothing at all. Measured: it cost the whole air band.
  hp.frequency.value = 4800;
  const g = ctx.createGain();
  const dur = open ? 0.26 : 0.045;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.055 * vel, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.25, 0.25);
  s.connect(hp).connect(g).connect(pan).connect(dest);
  s.start(at, randomOffset(nb), dur + 0.05);
  kill(s, [hp, g, pan]);
}

/** Brushed timekeeping for the classical deck, where a drum kit would be wrong. */
export function brush({ ctx, dest }: Ctx, at: number, vel = 1) {
  const nb = noiseBuffer(ctx, "pink");
  const s = ctx.createBufferSource();
  s.buffer = nb;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = pick([2400, 3200, 4000]);
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.03 * vel, at + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
  s.connect(bp).connect(g).connect(dest);
  s.start(at, randomOffset(nb), 0.4);
  kill(s, [bp, g]);
}

/**
 * The tape and vinyl chain.
 *
 * This is most of what makes generated music read as "lofi" rather than as
 * "MIDI". The notes underneath are fairly plain; everything characterful is
 * done here, by degrading them.
 */

import { rand } from "../engine";
import { noiseBuffer, noiseSource, randomOffset, slowRandomLfo } from "../noise";
import { subscribeClock, poisson, type PoissonState } from "../clock";

export type Tape = {
  /** Instruments connect here. */
  input: GainNode;
  /** Connect this to the deck fader. */
  output: GainNode;
  /** Call on each kick to duck the music under it. */
  duck(at: number, amount?: number): void;
  dispose(): void;
};

export function createTape(
  ctx: AudioContext,
  opts: {
    /** 0 = clean, 1 = thoroughly chewed. */
    wear?: number;
    /** Vinyl surface noise level. */
    crackle?: number;
    /** Top end, Hz. Lofi wants about 7 k; classical wants to stay open. */
    tone?: number;
    /** Pitch instability depth, in cents. */
    wow?: number;
  } = {},
): Tape {
  const wear = opts.wear ?? 0.7;
  const input = ctx.createGain();
  const output = ctx.createGain();

  // Sidechain: the whole musical bus passes through this, and the kick pulls
  // it down. That pumping is a genre signature, not an accident.
  const duckGain = ctx.createGain();
  duckGain.gain.value = 1;

  /* --- wow and flutter ------------------------------------------- */
  // A modulated delay is a pitch shifter. Slow modulation is wow (a warped
  // record), fast modulation is flutter (a worn capstan). Real machines have
  // both, which is why a single LFO never sounds right.
  const delay = ctx.createDelay(0.2);
  delay.delayTime.value = 0.012;

  const wow = ctx.createOscillator();
  wow.type = "sine";
  wow.frequency.value = rand(0.4, 0.8);
  const wowAmt = ctx.createGain();
  wowAmt.gain.value = 0.0016 * (opts.wow ?? 1) * wear;

  const flutter = ctx.createOscillator();
  flutter.type = "sine";
  flutter.frequency.value = rand(5.5, 8.5);
  const flutAmt = ctx.createGain();
  flutAmt.gain.value = 0.00022 * (opts.wow ?? 1) * wear;

  // A slow random walk on top, so the warp is not a perfect sine.
  const drift = slowRandomLfo(ctx, 150, 0.1);
  const driftAmt = ctx.createGain();
  driftAmt.gain.value = 0.0012 * wear;

  wow.connect(wowAmt).connect(delay.delayTime);
  flutter.connect(flutAmt).connect(delay.delayTime);
  drift.connect(driftAmt).connect(delay.delayTime);

  /* --- saturation ------------------------------------------------- */
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  const drive = 1 + wear * 2.2;
  for (let i = 0; i < 2048; i++) {
    const x = (i / 2047) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";

  /* --- tone ------------------------------------------------------- */
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 55;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = opts.tone ?? 7200;
  lp.Q.value = 0.6;
  // A gentle dip where tape loses the upper mids.
  const dip = ctx.createBiquadFilter();
  dip.type = "peaking";
  dip.frequency.value = 3400;
  dip.Q.value = 1.1;
  dip.gain.value = -2.5 * wear;

  input.connect(duckGain);
  duckGain.connect(delay);
  delay.connect(shaper).connect(hp).connect(dip).connect(lp).connect(output);

  /* --- surface noise ---------------------------------------------- */
  const crackleLevel = opts.crackle ?? 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.012 * crackleLevel;
  const hiss = noiseSource(ctx, "pink");
  const hissFilt = ctx.createBiquadFilter();
  hissFilt.type = "bandpass";
  hissFilt.frequency.value = 3000;
  hissFilt.Q.value = 0.4;
  hiss.connect(hissFilt).connect(noiseGain).connect(output);
  hiss.start(0, randomOffset(hiss.buffer!));

  // Individual pops and ticks, Poisson distributed like the fire crackles.
  const popBus = ctx.createGain();
  popBus.gain.value = crackleLevel;
  popBus.connect(output);
  const popState: PoissonState = { next: 0 };
  const unsub = subscribeClock((from, to) => {
    poisson(popState, from, to, 7 * crackleLevel, (t) => {
      const nb = noiseBuffer(ctx, "white");
      const s = ctx.createBufferSource();
      s.buffer = nb;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = rand(900, 5000);
      f.Q.value = rand(2, 9);
      const g = ctx.createGain();
      const dur = rand(0.004, 0.02);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(rand(0.004, 0.03), t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner();
      p.pan.value = rand(-0.6, 0.6);
      s.connect(f).connect(g).connect(p).connect(popBus);
      s.start(t, randomOffset(nb), dur + 0.03);
      s.onended = () => {
        s.disconnect();
        f.disconnect();
        g.disconnect();
        p.disconnect();
      };
    });
  });

  wow.start();
  flutter.start();
  drift.start();

  return {
    input,
    output,
    duck(at: number, amount = 0.35) {
      const p = duckGain.gain;
      p.cancelScheduledValues(at);
      p.setValueAtTime(1, at);
      p.linearRampToValueAtTime(1 - amount, at + 0.012);
      p.linearRampToValueAtTime(1, at + 0.22);
    },
    dispose() {
      unsub();
      for (const n of [wow, flutter, drift, hiss]) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
        n.disconnect();
      }
      setTimeout(() => {
        for (const n of [input, duckGain, delay, shaper, hp, dip, lp, output, noiseGain, hissFilt, popBus, wowAmt, flutAmt, driftAmt]) {
          n.disconnect();
        }
      }, 600);
    },
  };
}

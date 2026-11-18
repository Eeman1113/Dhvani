/**
 * Procedural ambiences.
 *
 * Nothing here is a recording. Every sound is synthesised from shaped noise and
 * scheduled transients, which buys three things that matter a lot for an app
 * you leave running:
 *
 *   - it never loops, because there is no loop; hour four sounds like minute one
 *   - it weighs nothing, so the page opens instantly on a phone
 *   - it needs no licence and no credit
 *
 * Recorded sources live in sources.ts and are used only for the handful of
 * things synthesis genuinely cannot fake — a room full of people, birdsong.
 */

import { getContext, rand, randInt, pick } from "./engine";
import { noiseSource, noiseBuffer, slowRandomLfo, randomOffset } from "./noise";
import { subscribeClock, poisson, type PoissonState } from "./clock";

export type Voice = {
  /** Connect this to the per-sound fader. */
  out: AudioNode;
  dispose(): void;
};

export type VoiceBuilder = () => Voice;

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */

export type Rig = {
  ctx: AudioContext;
  out: GainNode;
  /** Register anything that needs stopping when the sound is switched off. */
  own<T extends AudioScheduledSourceNode>(n: T): T;
  cleanup(fn: () => void): void;
};

export function rig(): Rig & { finish(): Voice } {
  const ctx = getContext();
  const out = ctx.createGain();
  out.gain.value = 1;
  const sources: AudioScheduledSourceNode[] = [];
  const cleanups: (() => void)[] = [];

  const r: Rig = {
    ctx,
    out,
    own(n) {
      sources.push(n);
      return n;
    },
    cleanup(fn) {
      cleanups.push(fn);
    },
  };

  return {
    ...r,
    finish(): Voice {
      return {
        out,
        dispose() {
          for (const fn of cleanups) fn();
          for (const s of sources) {
            try {
              s.stop();
            } catch {
              /* already stopped */
            }
            s.disconnect();
          }
          // Let the fade-out finish before the graph goes away.
          setTimeout(() => out.disconnect(), 400);
        },
      };
    },
  };
}

export function filt(
  ctx: AudioContext,
  type: BiquadFilterType,
  freq: number,
  q = 1,
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

export function gain(ctx: AudioContext, v: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

/**
 * A short filtered-noise transient: the crackle, the droplet, the knock.
 * Self-disposing — this fires thousands of times an hour and must not leak.
 */
export function transient(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  opt: {
    freq: number;
    q?: number;
    type?: BiquadFilterType;
    dur: number;
    gain: number;
    attack?: number;
    pan?: number;
  },
) {
  const buf = noiseBuffer(ctx, "white");
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const dur = opt.dur;
  const atk = opt.attack ?? 0.0015;

  const bp = filt(ctx, opt.type ?? "bandpass", opt.freq, opt.q ?? 6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opt.gain), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const pan = ctx.createStereoPanner();
  pan.pan.value = opt.pan ?? rand(-0.7, 0.7);

  src.connect(bp).connect(g).connect(pan).connect(dest);
  src.start(t, randomOffset(buf), dur + 0.05);
  src.onended = () => {
    src.disconnect();
    bp.disconnect();
    g.disconnect();
    pan.disconnect();
  };
}

/** A struck resonant partial — bells, bowls, chimes. */
export function partial(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  freq: number,
  amp: number,
  decay: number,
  pan = 0,
) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  // Real bars and bowls drop very slightly in pitch as they ring down.
  osc.frequency.exponentialRampToValueAtTime(freq * 0.997, t + decay);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  const p = ctx.createStereoPanner();
  p.pan.value = pan;

  osc.connect(g).connect(p).connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.1);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
    p.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* noise colours                                                       */
/* ------------------------------------------------------------------ */

function colouredNoise(kind: "white" | "pink" | "brown", tilt?: number): Voice {
  const r = rig();
  const { ctx, out } = r;
  const src = r.own(noiseSource(ctx, kind));
  let node: AudioNode = src;
  if (tilt) node = node.connect(filt(ctx, "lowpass", tilt, 0.7));
  node.connect(gain(ctx, kind === "brown" ? 0.5 : 0.28)).connect(out);
  src.start(0, randomOffset(src.buffer!));
  return r.finish();
}

/* ------------------------------------------------------------------ */
/* rain                                                                */
/* ------------------------------------------------------------------ */

function rain(opts: {
  heavy?: boolean;
  muffled?: boolean;
  dropRate?: number;
}): Voice {
  const r = rig();
  const { ctx, out } = r;
  const heavy = opts.heavy ?? false;

  // The bed: pink noise is already close to the spectrum of falling water.
  const bed = r.own(noiseSource(ctx, "pink"));
  const hp = filt(ctx, "highpass", heavy ? 260 : 420, 0.6);
  const lp = filt(ctx, "lowpass", opts.muffled ? 1400 : heavy ? 7000 : 5200, 0.7);
  const bedGain = gain(ctx, heavy ? 0.5 : 0.3);
  bed.connect(hp).connect(lp).connect(bedGain).connect(out);
  bed.start(0, randomOffset(bed.buffer!));

  // A second, lower bed gives the downpour some weight under the hiss.
  if (heavy) {
    const low = r.own(noiseSource(ctx, "brown"));
    low.connect(filt(ctx, "lowpass", 500, 0.6)).connect(gain(ctx, 0.22)).connect(out);
    low.start(0, randomOffset(low.buffer!));
  }

  // Slow swell, so the rain comes and goes like weather rather than sitting
  // at one level for four hours.
  const lfo = r.own(slowRandomLfo(ctx, 240, 0.045));
  const depth = gain(ctx, heavy ? 0.14 : 0.11);
  lfo.connect(depth).connect(bedGain.gain);
  lfo.start();

  const sweep = r.own(slowRandomLfo(ctx, 190, 0.05));
  const sweepDepth = gain(ctx, 900);
  sweep.connect(sweepDepth).connect(lp.frequency);
  sweep.start();

  // Individual drops on top of the bed. This is what sells it as rain rather
  // than as filtered static.
  const drops = gain(ctx, opts.muffled ? 0.5 : 0.85);
  drops.connect(out);
  const st: PoissonState = { next: 0 };
  const rate = opts.dropRate ?? (heavy ? 34 : 14);
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, rate, (t) => {
        transient(ctx, drops, t, {
          freq: rand(opts.muffled ? 700 : 1400, opts.muffled ? 2200 : 6500),
          q: rand(3, 9),
          dur: rand(0.012, 0.05),
          gain: rand(0.012, 0.05),
        });
      });
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* thunder                                                             */
/* ------------------------------------------------------------------ */

function thunder(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 1);
  bus.connect(out);

  const strike = (t: number) => {
    const near = Math.random() < 0.28;
    const dur = near ? rand(3.2, 5.5) : rand(5, 9);
    const buf = noiseBuffer(ctx, "brown");
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = rand(0.5, 0.9);

    const lp = filt(ctx, "lowpass", near ? 420 : 170, 0.9);
    const g = ctx.createGain();
    const peak = near ? rand(0.55, 0.9) : rand(0.18, 0.4);

    // A roll, not a hit: thunder swells, cracks, then tumbles away.
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * 0.4, t + rand(0.15, 0.5));
    g.gain.exponentialRampToValueAtTime(peak, t + rand(0.6, 1.4));
    g.gain.exponentialRampToValueAtTime(peak * 0.35, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    lp.frequency.setValueAtTime(near ? 900 : 300, t);
    lp.frequency.exponentialRampToValueAtTime(near ? 110 : 70, t + dur);

    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.4, 0.4);

    src.connect(lp).connect(g).connect(pan).connect(bus);
    src.start(t, randomOffset(buf));
    src.stop(t + dur + 0.2);
    src.onended = () => {
      src.disconnect();
      lp.disconnect();
      g.disconnect();
      pan.disconnect();
    };

    if (near) {
      // The initial crack, a fraction before the roll.
      transient(ctx, bus, t + 0.02, {
        freq: rand(600, 1600),
        q: 1.2,
        dur: rand(0.25, 0.5),
        gain: rand(0.1, 0.22),
        attack: 0.004,
      });
    }
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      // On average one roll every ~40 s. Exponential gaps mean sometimes two
      // land close together and sometimes the sky is quiet for two minutes,
      // which is the part that makes it feel like real weather.
      poisson(st, from, to, 1 / 40, strike, 6);
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* fire                                                                */
/* ------------------------------------------------------------------ */

function fire(): Voice {
  const r = rig();
  const { ctx, out } = r;

  // The roar: low noise that breathes as the flame draws air.
  const bed = r.own(noiseSource(ctx, "brown"));
  const lp = filt(ctx, "lowpass", 380, 0.8);
  const bedGain = gain(ctx, 0.3);
  bed.connect(lp).connect(bedGain).connect(out);
  bed.start(0, randomOffset(bed.buffer!));

  const breath = r.own(slowRandomLfo(ctx, 120, 0.3));
  const bDepth = gain(ctx, 0.16);
  breath.connect(bDepth).connect(bedGain.gain);
  const bFilt = gain(ctx, 220);
  breath.connect(bFilt).connect(lp.frequency);
  breath.start();

  // A hiss layer — steam and fine sizzle from the wood.
  const hiss = r.own(noiseSource(ctx, "pink"));
  hiss
    .connect(filt(ctx, "bandpass", 2600, 0.8))
    .connect(gain(ctx, 0.05))
    .connect(out);
  hiss.start(0, randomOffset(hiss.buffer!));

  const crackles = gain(ctx, 1);
  crackles.connect(out);

  const small: PoissonState = { next: 0 };
  const big: PoissonState = { next: 0 };

  r.cleanup(
    subscribeClock((from, to) => {
      // Constant fine ticking…
      poisson(small, from, to, 11, (t) => {
        transient(ctx, crackles, t, {
          freq: rand(1100, 4800),
          q: rand(5, 14),
          dur: rand(0.006, 0.03),
          gain: rand(0.02, 0.09),
        });
      });
      // …and the occasional proper pop that makes you look up.
      poisson(big, from, to, 0.55, (t) => {
        const pan = rand(-0.5, 0.5);
        transient(ctx, crackles, t, {
          freq: rand(300, 900),
          q: rand(2, 5),
          dur: rand(0.05, 0.16),
          gain: rand(0.1, 0.3),
          pan,
        });
        // Pops usually arrive as a little cluster of splinters.
        const n = Math.floor(rand(1, 4));
        for (let i = 0; i < n; i++) {
          transient(ctx, crackles, t + rand(0.01, 0.12), {
            freq: rand(1500, 5200),
            q: rand(6, 16),
            dur: rand(0.008, 0.025),
            gain: rand(0.03, 0.1),
            pan: pan + rand(-0.15, 0.15),
          });
        }
      });
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* wind                                                                */
/* ------------------------------------------------------------------ */

function wind(opts: { high?: boolean } = {}): Voice {
  const r = rig();
  const { ctx, out } = r;

  const src = r.own(noiseSource(ctx, "pink"));
  const bp = filt(ctx, "bandpass", opts.high ? 1500 : 480, opts.high ? 3.2 : 1.1);
  const g = gain(ctx, opts.high ? 0.6 : 0.5);
  src.connect(bp).connect(g).connect(out);
  src.start(0, randomOffset(src.buffer!));

  // Gusts: one slow walk drives both the filter and the level, so the wind
  // gets brighter as it gets louder — which is what actually happens.
  const gust = r.own(slowRandomLfo(ctx, 300, 0.08));
  const fDepth = gain(ctx, opts.high ? 700 : 340);
  gust.connect(fDepth).connect(bp.frequency);
  const aDepth = gain(ctx, 0.3);
  gust.connect(aDepth).connect(g.gain);
  gust.start();

  // A second, faster walk for the edge of the gust.
  const flutter = r.own(slowRandomLfo(ctx, 90, 0.5));
  const flDepth = gain(ctx, 0.08);
  flutter.connect(flDepth).connect(g.gain);
  flutter.start();

  // Low body, so wind at ground level is not all hiss. Mountain wind skips it
  // on purpose: thin air over bare rock has nothing to resonate, and leaving
  // the bottom out is the entire difference between the two sounds.
  if (!opts.high) {
    const low = r.own(noiseSource(ctx, "brown"));
    low.connect(filt(ctx, "lowpass", 260, 0.7)).connect(gain(ctx, 0.2)).connect(out);
    low.start(0, randomOffset(low.buffer!));
  } else {
    // A faint whistle where the wind catches an edge.
    const whistle = r.own(noiseSource(ctx, "pink"));
    const wf = filt(ctx, "bandpass", 2600, 7);
    whistle.connect(wf).connect(gain(ctx, 0.3)).connect(out);
    whistle.start(0, randomOffset(whistle.buffer!));
    const wlfo = r.own(slowRandomLfo(ctx, 220, 0.09));
    wlfo.connect(gain(ctx, 900)).connect(wf.frequency);
    wlfo.start();
  }

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* water                                                               */
/* ------------------------------------------------------------------ */

function waves(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const body = r.own(noiseSource(ctx, "brown"));
  const bodyLp = filt(ctx, "lowpass", 700, 0.6);
  const bodyGain = gain(ctx, 0.12);
  body.connect(bodyLp).connect(bodyGain).connect(out);
  body.start(0, randomOffset(body.buffer!));

  // The crest: bright foam that only appears at the top of the swell.
  const foam = r.own(noiseSource(ctx, "pink"));
  const foamBp = filt(ctx, "highpass", 1800, 0.7);
  const foamGain = gain(ctx, 0.0);
  foam.connect(foamBp).connect(foamGain).connect(out);
  foam.start(0, randomOffset(foam.buffer!));

  // Waves do have a period, but sets vary. A sine for the swell plus a random
  // walk for the set size reads as the sea; a bare sine reads as a washing machine.
  const swell = ctx.createOscillator();
  swell.type = "sine";
  swell.frequency.value = 1 / 9.5;
  const swellShape = ctx.createWaveShaper();
  // Push the sine toward a sawtooth-ish rise/fall: slow draw back, faster break.
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.55);
  }
  swellShape.curve = curve;

  const bodyDepth = gain(ctx, 0.1);
  const foamDepth = gain(ctx, 0.05);
  swell.connect(swellShape);
  swellShape.connect(bodyDepth).connect(bodyGain.gain);
  swellShape.connect(foamDepth).connect(foamGain.gain);
  swell.start();
  r.own(swell);

  // Vary the period over minutes so the sets drift.
  const setWalk = r.own(slowRandomLfo(ctx, 400, 0.02));
  const setDepth = gain(ctx, 0.035);
  setWalk.connect(setDepth).connect(swell.frequency);
  setWalk.start();

  const spray = r.own(slowRandomLfo(ctx, 260, 0.03));
  spray.connect(gain(ctx, 400)).connect(bodyLp.frequency);
  spray.start();

  return r.finish();
}

function stream(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const src = r.own(noiseSource(ctx, "pink"));
  src
    .connect(filt(ctx, "highpass", 900, 0.7))
    .connect(filt(ctx, "lowpass", 7000, 0.6))
    .connect(gain(ctx, 0.24))
    .connect(out);
  src.start(0, randomOffset(src.buffer!));

  // Burbles: a resonant filter sweeping fast over a noise burst is a
  // surprisingly convincing bubble.
  const burbles = gain(ctx, 0.9);
  burbles.connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 9, (t) => {
        const buf = noiseBuffer(ctx, "white");
        const s = ctx.createBufferSource();
        s.buffer = buf;
        const f = filt(ctx, "bandpass", rand(500, 1400), rand(12, 26));
        const dur = rand(0.04, 0.13);
        // Anchor first. A ramp with no preceding event starts from the value
        // at the moment of the call, which is up to a full lookahead window
        // before t, so the sweep would finish before the burst ever played.
        f.frequency.setValueAtTime(f.frequency.value, t);
        f.frequency.exponentialRampToValueAtTime(rand(900, 2600), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(rand(0.03, 0.09), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const p = ctx.createStereoPanner();
        p.pan.value = rand(-0.8, 0.8);
        s.connect(f).connect(g).connect(p).connect(burbles);
        s.start(t, randomOffset(buf), dur + 0.05);
        s.onended = () => {
          s.disconnect();
          f.disconnect();
          g.disconnect();
          p.disconnect();
        };
      });
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* night                                                               */
/* ------------------------------------------------------------------ */

function crickets(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const bus = gain(ctx, 0.9);
  bus.connect(filt(ctx, "highpass", 2000, 0.7)).connect(out);

  // A cricket is a burst of fast pulses around 4-5 kHz, repeated in bars.
  //
  // The Q here is very high, which is what gives the chirp its pure, almost
  // whistled tone. It also means the filter passes only about 150 Hz out of
  // the noise source's full bandwidth and throws the rest away, so the
  // envelope has to be driven roughly twenty decibels harder than the other
  // transients in this file to come out at a comparable level.
  const chirp = (t: number, freq: number, pan: number, pulses: number) => {
    for (let i = 0; i < pulses; i++) {
      transient(ctx, bus, t + i * 0.028, {
        freq,
        q: 28,
        dur: 0.018,
        gain: rand(0.55, 0.95),
        pan,
      });
    }
  };

  // A handful of individual insects, each with its own pitch, position and
  // tempo. The interference between them is the whole sound of a summer night.
  const birds = Array.from({ length: 7 }, () => ({
    st: { next: 0 } as PoissonState,
    freq: rand(3600, 5400),
    pan: rand(-0.9, 0.9),
    rate: rand(0.35, 0.9),
    pulses: Math.floor(rand(3, 6)),
  }));

  r.cleanup(
    subscribeClock((from, to) => {
      for (const b of birds) {
        poisson(b.st, from, to, b.rate, (t) =>
          chirp(t, b.freq * rand(0.99, 1.01), b.pan, b.pulses),
        );
      }
    }),
  );

  // A faint air bed underneath so the silence between chirps is not digital.
  const air = r.own(noiseSource(ctx, "pink"));
  air.connect(filt(ctx, "bandpass", 5200, 0.5)).connect(gain(ctx, 0.02)).connect(out);
  air.start(0, randomOffset(air.buffer!));

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* zen                                                                 */
/* ------------------------------------------------------------------ */

const BOWL_PARTIALS = [1, 2.74, 5.41, 8.93, 13.34]; // roughly a Tibetan bowl

function singingBowl(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(filt(ctx, "lowpass", 5000, 0.7)).connect(out);

  const strike = (t: number) => {
    const f0 = pick([174, 196, 220, 261.6]);
    const pan = rand(-0.25, 0.25);
    BOWL_PARTIALS.forEach((ratio, i) => {
      partial(
        ctx,
        bus,
        t,
        f0 * ratio * rand(0.998, 1.002),
        (0.28 / (i + 1)) * rand(0.8, 1.2),
        rand(9, 18) / (1 + i * 0.35),
        pan + rand(-0.1, 0.1),
      );
    });
    // The mallet on the rim.
    transient(ctx, bus, t, { freq: 2400, q: 2, dur: 0.06, gain: 0.05, pan });
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 1 / 26, strike, 4);
    }),
  );

  return r.finish();
}

const CHIME_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19]; // major pentatonic, two octaves

function windChimes(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.35);
  bus.connect(out);

  const root = 392; // G4
  const ring = (t: number) => {
    const semi = pick(CHIME_SCALE);
    const f = root * Math.pow(2, semi / 12);
    const pan = rand(-0.7, 0.7);
    // Tube chimes are strongly inharmonic — that metallic shimmer is the 2.76
    // and 5.4 partials, not a harmonic series.
    [1, 2.76, 5.4, 8.9].forEach((ratio, i) => {
      partial(ctx, bus, t, f * ratio, (0.2 / (i + 1.4)) * rand(0.7, 1.2), rand(2.5, 6) / (1 + i * 0.5), pan);
    });
  };

  // Chimes cluster: the wind catches them, several sound, then quiet.
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 1 / 7, (t) => {
        const n = Math.floor(rand(1, 5));
        for (let i = 0; i < n; i++) ring(t + rand(0, 1.4));
      }, 20);
    }),
  );

  return r.finish();
}

function shishiOdoshi(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.6);
  bus.connect(out);

  // The bamboo fills with water, tips, and knocks against the stone.
  const knock = (t: number) => {
    const pan = rand(-0.2, 0.2);
    [1, 2.1, 3.4].forEach((ratio, i) =>
      partial(ctx, bus, t, 180 * ratio * rand(0.99, 1.01), 0.3 / (i + 1), rand(0.25, 0.5) / (i + 1), pan),
    );
    transient(ctx, bus, t, { freq: rand(900, 1600), q: 3, dur: 0.05, gain: 0.08, pan });
    // Water pouring out after the tip.
    for (let i = 0; i < 14; i++) {
      transient(ctx, bus, t + 0.08 + i * rand(0.01, 0.05), {
        freq: rand(1200, 4000),
        q: rand(8, 20),
        dur: rand(0.01, 0.04),
        gain: rand(0.01, 0.035),
        pan: pan + rand(-0.2, 0.2),
      });
    }
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 1 / 17, knock, 4);
    }),
  );

  // Faint trickle feeding the bamboo.
  const trickle = r.own(noiseSource(ctx, "pink"));
  trickle.connect(filt(ctx, "bandpass", 3200, 1.2)).connect(gain(ctx, 0.02)).connect(out);
  trickle.start(0, randomOffset(trickle.buffer!));

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* rooms and machines                                                  */
/* ------------------------------------------------------------------ */

function hum(opts: { freq?: number; bright?: boolean } = {}): Voice {
  const r = rig();
  const { ctx, out } = r;
  const base = opts.freq ?? 72;

  // Two slightly detuned oscillators beat against each other, which is what
  // gives a real fan or cabin that restless, non-static quality.
  for (const detune of [0, 7, -5]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = base;
    o.detune.value = detune;
    o.connect(filt(ctx, "lowpass", opts.bright ? 400 : 180, 2))
      .connect(gain(ctx, 0.07))
      .connect(out);
    o.start();
    r.own(o);
  }

  const air = r.own(noiseSource(ctx, "brown"));
  air
    .connect(filt(ctx, "lowpass", opts.bright ? 1600 : 700, 0.6))
    .connect(gain(ctx, opts.bright ? 0.3 : 0.22))
    .connect(out);
  air.start(0, randomOffset(air.buffer!));

  const wobble = r.own(slowRandomLfo(ctx, 150, 0.2));
  wobble.connect(gain(ctx, 0.04)).connect(out.gain);
  wobble.start();

  return r.finish();
}

type KeyFeel = {
  /** Centre of the down-stroke click. Higher is sharper and more plastic. */
  click: number;
  /** How tight that click is. A high Q reads as a ping, a low one as a thud. */
  clickQ: number;
  /** Pitch of the bottom-out thunk, which is the sound of the case, not the switch. */
  body: number;
  bodyAmp: number;
  level: number;
  /** Clicky switches fire a second, higher click from the jacket. */
  jacket?: number;
  /** Mean seconds per keystroke inside a burst. */
  speed: [number, number];
};

/**
 * Typing.
 *
 * A keypress is three sounds, not one: the switch actuating, the keycap
 * bottoming out against the plate, and the quieter release as the spring
 * pushes it back up. Which of the three dominates is the entire difference
 * between a laptop and a mechanical board, so they are all tunable here.
 */
function keyboard(feel: KeyFeel): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, feel.level);
  bus.connect(filt(ctx, "highpass", 140, 0.7)).connect(out);

  const press = (t: number) => {
    const pan = rand(-0.35, 0.35);
    // Down-stroke.
    transient(ctx, bus, t, {
      freq: feel.click * rand(0.82, 1.22),
      q: feel.clickQ * rand(0.8, 1.25),
      dur: rand(0.01, 0.028),
      gain: rand(0.05, 0.12),
      pan,
    });
    if (feel.jacket) {
      transient(ctx, bus, t + rand(0.001, 0.004), {
        freq: feel.jacket * rand(0.9, 1.15),
        q: rand(8, 20),
        dur: rand(0.006, 0.018),
        gain: rand(0.04, 0.1),
        pan,
      });
    }
    // Bottom-out: the case.
    partial(ctx, bus, t + 0.004, feel.body * rand(0.9, 1.15), feel.bodyAmp * rand(0.7, 1.3), rand(0.03, 0.07), pan);
    // Release.
    transient(ctx, bus, t + rand(0.035, 0.085), {
      freq: feel.click * rand(1.1, 1.6),
      q: feel.clickQ * 0.8,
      dur: 0.012,
      gain: rand(0.012, 0.035),
      pan,
    });
  };

  // Typing comes in bursts with thinking-pauses between them.
  let burstEnd = 0;
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      let t = Math.max(st.next, from);
      let guard = 0;
      while (t < to && guard++ < 400) {
        if (t > burstEnd) {
          t += rand(0.4, 2.6);
          burstEnd = t + rand(0.8, 3.5);
          continue;
        }
        press(t);
        t += rand(feel.speed[0], feel.speed[1]);
      }
      st.next = t;
    }),
  );

  return r.finish();
}

/**
 * A typewriter is a different machine, not a different keyboard: every key is
 * a hammer hitting a platen, and at the end of each line a bell rings and the
 * carriage is thrown back by hand.
 */
function typewriter(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(out);

  const strike = (t: number) => {
    const pan = rand(-0.25, 0.25);
    transient(ctx, bus, t, { freq: rand(1800, 4200), q: rand(1.2, 3), dur: rand(0.02, 0.05), gain: rand(0.12, 0.26), pan });
    partial(ctx, bus, t, rand(190, 340), 0.1, rand(0.05, 0.12), pan);
    transient(ctx, bus, t + rand(0.01, 0.03), { freq: rand(700, 1600), q: 2, dur: 0.03, gain: 0.05, pan });
  };

  let cursor = 0;
  let keysLeft = randInt(30, 62);
  r.cleanup(
    subscribeClock((from, to) => {
      if (cursor < from) cursor = from;
      let guard = 0;
      while (cursor < to && guard++ < 200) {
        strike(cursor);
        cursor += rand(0.11, 0.42);
        if (--keysLeft <= 0) {
          // End of the line: the margin bell, then the carriage return.
          const bell = cursor;
          [1, 2.76, 5.4].forEach((k, i) =>
            partial(ctx, bus, bell, 1180 * k, 0.07 / (i + 1.4), rand(1.2, 2.4) / (i + 1), 0.3),
          );
          const ret = bell + rand(0.25, 0.6);
          for (let i = 0; i < 16; i++) {
            transient(ctx, bus, ret + i * rand(0.004, 0.012), {
              freq: rand(900, 4000),
              q: rand(1.5, 4),
              dur: rand(0.01, 0.03),
              gain: rand(0.03, 0.09),
              pan: -0.4 + (i / 16) * 0.8,
            });
          }
          transient(ctx, bus, ret + 0.18, { freq: 260, q: 2, dur: 0.12, gain: 0.14, pan: -0.3 });
          cursor = ret + rand(0.4, 0.9);
          keysLeft = randInt(30, 62);
        }
      }
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* registry                                                            */
/* ------------------------------------------------------------------ */

import { CROWD_VOICES } from "./voices-crowd";
import { EXTENDED_VOICES } from "./voices-extended";

const CORE_VOICES: Record<string, VoiceBuilder> = {
  "rain-light": () => rain({}),
  "rain-heavy": () => rain({ heavy: true }),
  "rain-window": () => rain({ muffled: true, dropRate: 7 }),
  thunder: () => thunder(),
  fire: () => fire(),
  wind: () => wind(),
  "wind-high": () => wind({ high: true }),
  waves: () => waves(),
  stream: () => stream(),
  crickets: () => crickets(),
  bowl: () => singingBowl(),
  chimes: () => windChimes(),
  "shishi-odoshi": () => shishiOdoshi(),
  "noise-white": () => colouredNoise("white"),
  "noise-pink": () => colouredNoise("pink"),
  "noise-brown": () => colouredNoise("brown", 1200),
  fan: () => hum({ freq: 60, bright: true }),
  cabin: () => hum({ freq: 48 }),
  // Four boards with genuinely different voices, plus the machine they descend from.
  "keyboard-soft": () =>
    keyboard({ click: 1900, clickQ: 1.4, body: 150, bodyAmp: 0.05, level: 0.42, speed: [0.07, 0.19] }),
  "keyboard-thock": () =>
    keyboard({ click: 900, clickQ: 1.1, body: 105, bodyAmp: 0.13, level: 0.5, speed: [0.08, 0.2] }),
  "keyboard-clicky": () =>
    keyboard({ click: 3400, clickQ: 4.5, body: 210, bodyAmp: 0.05, level: 0.45, jacket: 5200, speed: [0.07, 0.18] }),
  "keyboard-tactile": () =>
    keyboard({ click: 2400, clickQ: 2.4, body: 170, bodyAmp: 0.08, level: 0.45, speed: [0.07, 0.19] }),
  typewriter: () => typewriter(),
};

/**
 * Everything the mixer can build. Split across three files only because one
 * file of synthesis this long is unreadable, not because they differ in kind.
 */
export const SYNTH_VOICES: Record<string, VoiceBuilder> = {
  ...CORE_VOICES,
  ...CROWD_VOICES,
  ...EXTENDED_VOICES,
};

/**
 * The rest of the library.
 *
 * Same rules as voices.ts: shaped noise, scheduled transients, nothing
 * recorded, nothing that loops. Grouped roughly by where you would be if you
 * were hearing it.
 */

import { rand, randInt, pick } from "./engine";
import { noiseSource, randomOffset, slowRandomLfo, noiseBuffer } from "./noise";
import { subscribeClock, poisson, type PoissonState } from "./clock";
import { rig, filt, gain, transient, partial, type Voice } from "./voices";

/* ------------------------------------------------------------------ */
/* rain, continued                                                     */
/* ------------------------------------------------------------------ */

/** Rain hitting a stretched surface: canvas, a car roof, a skylight. */
function rainOnSurface(opts: { resonance: number; bright: number; rate: number }): Voice {
  const r = rig();
  const { ctx, out } = r;

  const bed = r.own(noiseSource(ctx, "pink"));
  bed.connect(filt(ctx, "highpass", 300, 0.6))
    .connect(filt(ctx, "lowpass", opts.bright, 0.7))
    .connect(gain(ctx, 0.2))
    .connect(out);
  bed.start(0, randomOffset(bed.buffer!));

  // The surface itself rings at a pitch. That resonance is the whole reason
  // rain on a tent sounds nothing like rain on grass.
  const body = filt(ctx, "bandpass", opts.resonance, 3.5);
  body.connect(gain(ctx, 0.8)).connect(out);

  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, opts.rate, (t) => {
        transient(ctx, body, t, {
          freq: opts.resonance * rand(0.7, 1.5),
          q: rand(2, 6),
          dur: rand(0.015, 0.06),
          gain: rand(0.02, 0.08),
        });
      });
    }),
  );

  return r.finish();
}

/** Slow drips in a hard, empty space. */
function drips(opts: { rate: number; space: number }): Voice {
  const r = rig();
  const { ctx, out } = r;

  // A short feedback delay standing in for a cave. Cheap, and at this level
  // nobody is going to audit the impulse response.
  const d = ctx.createDelay(1);
  d.delayTime.value = opts.space;
  const fb = gain(ctx, 0.45);
  const tone = filt(ctx, "lowpass", 2600, 0.7);
  d.connect(tone).connect(fb).connect(d);
  const bus = gain(ctx, 0.8);
  bus.connect(out);
  bus.connect(d);
  d.connect(gain(ctx, 0.5)).connect(out);

  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, opts.rate, (t) => {
        // A drip is a pitch that rises as the cavity it made closes up.
        const f = rand(700, 2200);
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(f * 0.6, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.045);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(rand(0.08, 0.2), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        const p = ctx.createStereoPanner();
        p.pan.value = rand(-0.7, 0.7);
        o.connect(g).connect(p).connect(bus);
        o.start(t);
        o.stop(t + 0.15);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
          p.disconnect();
        };
        transient(ctx, bus, t, { freq: rand(2000, 5000), q: 4, dur: 0.012, gain: 0.03 });
      });
    }),
  );

  // Faint moving air in the space.
  const air = r.own(noiseSource(ctx, "brown"));
  air.connect(filt(ctx, "lowpass", 300, 0.6)).connect(gain(ctx, 0.1)).connect(out);
  air.start(0, randomOffset(air.buffer!));

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* water, continued                                                    */
/* ------------------------------------------------------------------ */

function waterfall(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const low = r.own(noiseSource(ctx, "brown"));
  low.connect(filt(ctx, "lowpass", 900, 0.6)).connect(gain(ctx, 0.5)).connect(out);
  low.start(0, randomOffset(low.buffer!));

  const spray = r.own(noiseSource(ctx, "pink"));
  const sprayFilt = filt(ctx, "highpass", 1600, 0.6);
  const sprayGain = gain(ctx, 0.3);
  spray.connect(sprayFilt).connect(sprayGain).connect(out);
  spray.start(0, randomOffset(spray.buffer!));

  // Mass of falling water surges; it does not sit at one level.
  const surge = r.own(slowRandomLfo(ctx, 200, 0.07));
  surge.connect(gain(ctx, 0.12)).connect(sprayGain.gain);
  surge.connect(gain(ctx, 500)).connect(sprayFilt.frequency);
  surge.start();

  return r.finish();
}

function rapids(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const src = r.own(noiseSource(ctx, "pink"));
  src.connect(filt(ctx, "highpass", 500, 0.7)).connect(gain(ctx, 0.3)).connect(out);
  src.start(0, randomOffset(src.buffer!));

  const low = r.own(noiseSource(ctx, "brown"));
  low.connect(filt(ctx, "lowpass", 400, 0.7)).connect(gain(ctx, 0.3)).connect(out);
  low.start(0, randomOffset(low.buffer!));

  const churn = gain(ctx, 0.9);
  churn.connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 26, (t) => {
        transient(ctx, churn, t, {
          freq: rand(400, 2600),
          q: rand(8, 20),
          dur: rand(0.03, 0.1),
          gain: rand(0.015, 0.05),
        });
      });
    }),
  );

  return r.finish();
}

function underwater(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const src = r.own(noiseSource(ctx, "brown"));
  const lp = filt(ctx, "lowpass", 320, 1.2);
  src.connect(lp).connect(gain(ctx, 0.6)).connect(out);
  src.start(0, randomOffset(src.buffer!));

  const sway = r.own(slowRandomLfo(ctx, 160, 0.1));
  sway.connect(gain(ctx, 140)).connect(lp.frequency);
  sway.start();

  const bubbles = gain(ctx, 0.5);
  bubbles.connect(filt(ctx, "lowpass", 1800, 0.7)).connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 3.5, (t) => {
        const n = randInt(1, 6);
        for (let i = 0; i < n; i++) {
          const at = t + i * rand(0.02, 0.09);
          const f = rand(300, 1100);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(f, at);
          o.frequency.exponentialRampToValueAtTime(f * rand(1.6, 3), at + 0.05);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(rand(0.04, 0.12), at + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
          const p = ctx.createStereoPanner();
          p.pan.value = rand(-0.8, 0.8);
          o.connect(g).connect(p).connect(bubbles);
          o.start(at);
          o.stop(at + 0.12);
          o.onended = () => {
            o.disconnect();
            g.disconnect();
            p.disconnect();
          };
        }
      });
    }),
  );

  return r.finish();
}

function kettle(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const hiss = r.own(noiseSource(ctx, "pink"));
  const hp = filt(ctx, "highpass", 2200, 0.7);
  hiss.connect(hp).connect(gain(ctx, 0.14)).connect(out);
  hiss.start(0, randomOffset(hiss.buffer!));

  const body = r.own(noiseSource(ctx, "brown"));
  body.connect(filt(ctx, "bandpass", 420, 1.4)).connect(gain(ctx, 0.3)).connect(out);
  body.start(0, randomOffset(body.buffer!));

  const boil = gain(ctx, 0.7);
  boil.connect(filt(ctx, "bandpass", 1200, 1.1)).connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 42, (t) => {
        transient(ctx, boil, t, {
          freq: rand(500, 2400),
          q: rand(10, 24),
          dur: rand(0.006, 0.025),
          gain: rand(0.008, 0.03),
        });
      });
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* wind, continued                                                     */
/* ------------------------------------------------------------------ */

function blizzard(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const src = r.own(noiseSource(ctx, "pink"));
  const bp = filt(ctx, "bandpass", 1100, 1.6);
  const g = gain(ctx, 0.55);
  src.connect(bp).connect(g).connect(out);
  src.start(0, randomOffset(src.buffer!));

  const gust = r.own(slowRandomLfo(ctx, 240, 0.14));
  gust.connect(gain(ctx, 700)).connect(bp.frequency);
  gust.connect(gain(ctx, 0.34)).connect(g.gain);
  gust.start();

  // Fine ice against a surface.
  const ice = r.own(noiseSource(ctx, "white"));
  ice.connect(filt(ctx, "highpass", 6000, 0.7)).connect(gain(ctx, 0.07)).connect(out);
  ice.start(0, randomOffset(ice.buffer!));

  const low = r.own(noiseSource(ctx, "brown"));
  low.connect(filt(ctx, "lowpass", 200, 0.7)).connect(gain(ctx, 0.3)).connect(out);
  low.start(0, randomOffset(low.buffer!));

  return r.finish();
}

/** Leaves. Rustle arrives in gusts, so the density follows a slow walk. */
function leaves(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const bus = gain(ctx, 0.8);
  bus.connect(filt(ctx, "highpass", 900, 0.6)).connect(out);

  // One shared walk decides how hard the wind is blowing right now, which the
  // scheduler reads to decide how many leaves to move.
  const gust = r.own(slowRandomLfo(ctx, 210, 0.09));
  const gustGain = gain(ctx, 1);
  gust.connect(gustGain);
  gust.start();

  let intensity = 0.5;
  let phase = 0;
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      // The LFO's value is not readable from the main thread, so the gust
      // shape is mirrored here with a slow wander of its own.
      phase += (to - from) * 0.12;
      intensity = 0.5 + 0.45 * Math.sin(phase) * Math.sin(phase * 0.37 + 1.1);
      poisson(st, from, to, 30 + intensity * 70, (t) => {
        transient(ctx, bus, t, {
          freq: rand(1800, 7000),
          q: rand(1.5, 5),
          dur: rand(0.008, 0.035),
          gain: rand(0.004, 0.022) * (0.4 + intensity),
        });
      });
    }),
  );

  const air = r.own(noiseSource(ctx, "pink"));
  air.connect(filt(ctx, "bandpass", 700, 0.8)).connect(gain(ctx, 0.14)).connect(out);
  air.start(0, randomOffset(air.buffer!));

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* night, continued                                                    */
/* ------------------------------------------------------------------ */

function cicadas(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const bus = gain(ctx, 0.3);
  bus.connect(filt(ctx, "bandpass", 5200, 1.2)).connect(out);

  // A cicada is a carrier buzzing at a few kHz, amplitude-modulated in the
  // tens of hertz. The modulation is what makes it a cicada and not a hiss.
  for (let i = 0; i < 4; i++) {
    const src = r.own(noiseSource(ctx, "white"));
    const bp = filt(ctx, "bandpass", rand(4200, 6800), rand(6, 12));
    const am = gain(ctx, 0);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.85, 0.85);
    src.connect(bp).connect(am).connect(pan).connect(bus);
    src.start(0, randomOffset(src.buffer!));

    const mod = ctx.createOscillator();
    mod.type = "sawtooth";
    mod.frequency.value = rand(28, 52);
    const modAmt = gain(ctx, 0.5);
    const offset = ctx.createConstantSource();
    offset.offset.value = 0.5;
    mod.connect(modAmt).connect(am.gain);
    offset.connect(am.gain);
    mod.start();
    offset.start();
    r.own(mod);
    r.own(offset);

    // They swell and fade together, which is the sound of a hot afternoon.
    const swell = r.own(slowRandomLfo(ctx, 130 + i * 20, 0.06));
    swell.connect(gain(ctx, 0.35)).connect(am.gain);
    swell.start();
  }

  return r.finish();
}

function frogs(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(out);

  // A croak is a short train of pulses, low and throaty. Pulse rate sets the
  // species as much as pitch does.
  const croak = (t: number, f: number, pan: number, pulses: number, spacing: number) => {
    for (let i = 0; i < pulses; i++) {
      const at = t + i * spacing;
      [1, 2, 3].forEach((k, j) =>
        partial(ctx, bus, at, f * k * rand(0.97, 1.03), (0.12 / (j + 1.3)) * rand(0.6, 1.3), rand(0.03, 0.07), pan),
      );
      transient(ctx, bus, at, { freq: rand(600, 1800), q: 3, dur: 0.02, gain: 0.02, pan });
    }
  };

  const pond = Array.from({ length: 6 }, () => ({
    st: { next: 0 } as PoissonState,
    f: rand(110, 300),
    pan: rand(-0.9, 0.9),
    rate: rand(0.12, 0.5),
    pulses: randInt(2, 8),
    spacing: rand(0.045, 0.1),
  }));

  r.cleanup(
    subscribeClock((from, to) => {
      for (const f of pond) {
        poisson(f.st, from, to, f.rate, (t) => croak(t, f.f, f.pan, f.pulses, f.spacing));
      }
    }),
  );

  const water = r.own(noiseSource(ctx, "pink"));
  water.connect(filt(ctx, "bandpass", 4000, 0.6)).connect(gain(ctx, 0.015)).connect(out);
  water.start(0, randomOffset(water.buffer!));

  return r.finish();
}

function owls(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(out);

  const hoot = (t: number) => {
    const f = rand(330, 460);
    const pan = rand(-0.6, 0.6);
    const n = pick([2, 2, 3, 4]);
    for (let i = 0; i < n; i++) {
      const at = t + (i === 0 ? 0 : 0.55 + i * rand(0.28, 0.45));
      const dur = rand(0.3, 0.6);
      const o = ctx.createOscillator();
      o.type = "sine";
      const ff = f * (i === 0 ? 1 : rand(0.93, 1.0));
      o.frequency.setValueAtTime(ff * 0.97, at);
      o.frequency.linearRampToValueAtTime(ff, at + dur * 0.3);
      o.frequency.linearRampToValueAtTime(ff * 0.95, at + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(rand(0.06, 0.13), at + 0.07);
      g.gain.setValueAtTime(rand(0.06, 0.12), at + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      // An owl is almost a pure tone with a breathy edge.
      o.connect(g).connect(p).connect(bus);
      o.start(at);
      o.stop(at + dur + 0.1);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        p.disconnect();
      };
      transient(ctx, bus, at, { freq: ff * 3, q: 2, dur: dur * 0.6, gain: 0.006, pan });
    }
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(subscribeClock((from, to) => poisson(st, from, to, 1 / 22, hoot, 4)));

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* zen, continued                                                      */
/* ------------------------------------------------------------------ */

function templeBell(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.45);
  bus.connect(out);

  // A large bronze bell: a very low hum tone, a strike tone an octave up, and
  // a spray of inharmonic partials that die away much faster.
  const strike = (t: number) => {
    const f0 = rand(54, 78);
    const pan = rand(-0.2, 0.2);
    const parts: [number, number, number][] = [
      [1, 0.5, 26],
      [2, 0.38, 20],
      [2.4, 0.2, 12],
      [3.1, 0.16, 9],
      [4.2, 0.12, 6],
      [5.9, 0.09, 4],
      [8.3, 0.06, 2.4],
      [11.1, 0.04, 1.6],
    ];
    for (const [ratio, amp, decay] of parts) {
      partial(ctx, bus, t, f0 * ratio * rand(0.995, 1.005), amp * rand(0.8, 1.2), decay * rand(0.85, 1.15), pan + rand(-0.15, 0.15));
    }
    // The log striking the bronze.
    transient(ctx, bus, t, { freq: rand(900, 2200), q: 1.6, dur: 0.22, gain: 0.07, pan });
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(subscribeClock((from, to) => poisson(st, from, to, 1 / 48, strike, 3)));

  return r.finish();
}

function gong(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.3);
  bus.connect(filt(ctx, "lowpass", 6000, 0.7)).connect(out);

  const strike = (t: number) => {
    const f0 = rand(70, 110);
    const pan = rand(-0.3, 0.3);
    // A gong's spectrum is dense and genuinely inharmonic, and it blooms:
    // energy moves upward for a second or two after the strike before it
    // starts to fade. That bloom is why a gong sounds alive and a bell does not.
    for (let i = 0; i < 22; i++) {
      const f = f0 * rand(1, 16);
      const bloom = rand(0.2, 1.6);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      const amp = rand(0.01, 0.05) / (1 + f / 900);
      const decay = rand(5, 16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + bloom);
      g.gain.exponentialRampToValueAtTime(0.0001, t + bloom + decay);
      const p = ctx.createStereoPanner();
      p.pan.value = pan + rand(-0.5, 0.5);
      o.connect(g).connect(p).connect(bus);
      o.start(t);
      o.stop(t + bloom + decay + 0.2);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        p.disconnect();
      };
    }
    transient(ctx, bus, t, { freq: 400, q: 1, dur: 0.6, gain: 0.09, pan });
  };

  const st: PoissonState = { next: 0 };
  r.cleanup(subscribeClock((from, to) => poisson(st, from, to, 1 / 60, strike, 2)));

  return r.finish();
}

/** A breathy end-blown flute drone, in the shakuhachi register. */
function flute(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(out);

  const note = (t: number, f: number, dur: number) => {
    const pan = rand(-0.2, 0.2);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(bus);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(rand(0.1, 0.18), t + rand(0.25, 0.6));
    env.gain.setValueAtTime(rand(0.08, 0.15), t + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(p);

    // Nearly a pure tone, with just the odd harmonics a stopped pipe gives.
    [1, 2, 3].forEach((k, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * k;
      const g = gain(ctx, 0.7 / (k * k));
      // The player's breath wavers; a flute held perfectly steady is a synth.
      const v = ctx.createOscillator();
      v.type = "sine";
      v.frequency.value = rand(3.6, 5.4);
      const va = ctx.createGain();
      va.gain.setValueAtTime(0.0001, t);
      va.gain.linearRampToValueAtTime(rand(6, 18), t + dur * 0.4);
      v.connect(va).connect(o.detune);
      o.connect(g).connect(env);
      o.start(t);
      v.start(t);
      o.stop(t + dur + 0.3);
      v.stop(t + dur + 0.3);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        v.disconnect();
        va.disconnect();
      };
      void i;
    });

    // The breath noise across the blowing edge. On a shakuhachi this is not a
    // flaw to be minimised, it is half the instrument.
    const nb = noiseBuffer(ctx, "pink");
    const s = ctx.createBufferSource();
    s.buffer = nb;
    s.loop = true;
    const bf = filt(ctx, "bandpass", f * 2.5, 1.1);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(rand(0.04, 0.09), t + 0.12);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bf).connect(bg).connect(p);
    s.start(t, randomOffset(nb));
    s.stop(t + dur + 0.2);
    s.onended = () => {
      s.disconnect();
      bf.disconnect();
      bg.disconnect();
    };

    setTimeout(() => {
      env.disconnect();
      p.disconnect();
    }, (t - ctx.currentTime + dur + 2) * 1000);
  };

  // A minor pentatonic in the low register, played slowly with long silences.
  const root = 196; // G3
  const scale = [0, 3, 5, 7, 10, 12];
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 1 / 7, (t) => {
        note(t, root * Math.pow(2, pick(scale) / 12), rand(2.5, 6));
      }, 6);
    }),
  );

  return r.finish();
}

function rainstick(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(filt(ctx, "bandpass", 3600, 0.5)).connect(out);

  // Thousands of small grains falling past pins. The density changes slowly
  // as the stick empties, then it is turned over again.
  let phase = 0;
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      phase += (to - from) / 14;
      const density = 0.5 + 0.5 * Math.sin(phase);
      poisson(st, from, to, 30 + density * 140, (t) => {
        transient(ctx, bus, t, {
          freq: rand(2200, 8000),
          q: rand(6, 18),
          dur: rand(0.004, 0.016),
          gain: rand(0.005, 0.022),
        });
      });
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* rooms and machines, continued                                       */
/* ------------------------------------------------------------------ */

function clock(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(out);

  // Tick and tock are not the same sound. The escapement hits two different
  // pallets, and the difference is what makes a clock sound like a clock
  // rather than a metronome.
  let next = 0;
  let tock = false;
  r.cleanup(
    subscribeClock((from, to) => {
      if (next < from) next = from + 0.1;
      let guard = 0;
      while (next < to && guard++ < 10) {
        const f = tock ? rand(1500, 2100) : rand(2400, 3200);
        transient(ctx, bus, next, { freq: f, q: rand(3, 7), dur: tock ? 0.035 : 0.025, gain: tock ? 0.1 : 0.085, pan: tock ? -0.1 : 0.1 });
        partial(ctx, bus, next, rand(180, 260), 0.03, 0.05, 0);
        tock = !tock;
        // A real pendulum is not perfectly even.
        next += 1 + rand(-0.006, 0.006);
      }
    }),
  );

  // The case, and the room it is in.
  const room = r.own(noiseSource(ctx, "brown"));
  room.connect(filt(ctx, "lowpass", 260, 0.7)).connect(gain(ctx, 0.07)).connect(out);
  room.start(0, randomOffset(room.buffer!));

  return r.finish();
}

function fridge(): Voice {
  const r = rig();
  const { ctx, out } = r;

  // Compressor hum sits on the mains frequency and its harmonics.
  for (const [f, g] of [
    [50, 0.1],
    [100, 0.06],
    [150, 0.035],
    [200, 0.018],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * rand(0.998, 1.002);
    o.connect(gain(ctx, g)).connect(out);
    o.start();
    r.own(o);
  }

  const motor = r.own(noiseSource(ctx, "brown"));
  const mf = filt(ctx, "lowpass", 600, 1.1);
  const mg = gain(ctx, 0.3);
  motor.connect(mf).connect(mg).connect(out);
  motor.start(0, randomOffset(motor.buffer!));

  // It cycles: runs for a few minutes, stops, starts again.
  const cycle = r.own(slowRandomLfo(ctx, 420, 0.012));
  cycle.connect(gain(ctx, 0.2)).connect(mg.gain);
  cycle.start();

  return r.finish();
}

function washing(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const drum = r.own(noiseSource(ctx, "brown"));
  const lp = filt(ctx, "lowpass", 500, 1.3);
  const g = gain(ctx, 0.4);
  drum.connect(lp).connect(g).connect(out);
  drum.start(0, randomOffset(drum.buffer!));

  // The drum turns one way, pauses, turns the other.
  const turn = ctx.createOscillator();
  turn.type = "sine";
  turn.frequency.value = 0.42;
  turn.connect(gain(ctx, 0.22)).connect(g.gain);
  turn.connect(gain(ctx, 180)).connect(lp.frequency);
  turn.start();
  r.own(turn);

  const slosh = gain(ctx, 0.6);
  slosh.connect(filt(ctx, "bandpass", 1400, 0.8)).connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 14, (t) => {
        transient(ctx, slosh, t, { freq: rand(600, 3000), q: rand(2, 7), dur: rand(0.03, 0.12), gain: rand(0.01, 0.035) });
      });
    }),
  );

  return r.finish();
}

function train(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const roll = r.own(noiseSource(ctx, "brown"));
  const lp = filt(ctx, "lowpass", 700, 0.8);
  roll.connect(lp).connect(gain(ctx, 0.45)).connect(out);
  roll.start(0, randomOffset(roll.buffer!));

  const rail = r.own(noiseSource(ctx, "pink"));
  rail.connect(filt(ctx, "bandpass", 1600, 0.9)).connect(gain(ctx, 0.1)).connect(out);
  rail.start(0, randomOffset(rail.buffer!));

  // Rail joints: two bogies, so the clacks come in pairs, and each carriage
  // is the same length, so the pairs are evenly spaced.
  const clacks = gain(ctx, 0.6);
  clacks.connect(out);
  let next = 0;
  const period = rand(1.5, 2.3);
  r.cleanup(
    subscribeClock((from, to) => {
      if (next < from) next = from + 0.1;
      let guard = 0;
      while (next < to && guard++ < 10) {
        const pan = rand(-0.3, 0.3);
        transient(ctx, clacks, next, { freq: rand(120, 300), q: rand(2, 5), dur: rand(0.04, 0.1), gain: rand(0.05, 0.11), pan });
        transient(ctx, clacks, next + rand(0.1, 0.17), { freq: rand(120, 300), q: rand(2, 5), dur: rand(0.04, 0.1), gain: rand(0.04, 0.09), pan });
        next += period * rand(0.97, 1.03);
      }
    }),
  );

  const sway = r.own(slowRandomLfo(ctx, 170, 0.09));
  sway.connect(gain(ctx, 200)).connect(lp.frequency);
  sway.start();

  return r.finish();
}

function traffic(): Voice {
  const r = rig();
  const { ctx, out } = r;

  const bed = r.own(noiseSource(ctx, "brown"));
  bed.connect(filt(ctx, "lowpass", 900, 0.6)).connect(gain(ctx, 0.3)).connect(out);
  bed.start(0, randomOffset(bed.buffer!));

  // Individual vehicles passing: a band of noise that sweeps across the
  // stereo field and brightens as it comes level with you.
  const pass = gain(ctx, 0.6);
  pass.connect(out);
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 0.38, (t) => {
        const dur = rand(2.2, 5);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx, "pink");
        src.loop = true;
        const bp = filt(ctx, "bandpass", 500, 0.8);
        bp.frequency.setValueAtTime(380, t);
        bp.frequency.linearRampToValueAtTime(rand(900, 1500), t + dur * 0.5);
        bp.frequency.linearRampToValueAtTime(340, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(rand(0.04, 0.12), t + dur * 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const p = ctx.createStereoPanner();
        const dir = Math.random() < 0.5 ? 1 : -1;
        p.pan.setValueAtTime(-0.9 * dir, t);
        p.pan.linearRampToValueAtTime(0.9 * dir, t + dur);
        src.connect(bp).connect(g).connect(p).connect(pass);
        src.start(t, randomOffset(src.buffer!));
        src.stop(t + dur + 0.2);
        src.onended = () => {
          src.disconnect();
          bp.disconnect();
          g.disconnect();
          p.disconnect();
        };
      });
    }),
  );

  return r.finish();
}

function paper(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.5);
  bus.connect(filt(ctx, "highpass", 1200, 0.7)).connect(out);

  // Writing: a continuous scratch in short strokes, with pauses to think.
  let cursor = 0;
  let strokeEnd = 0;
  r.cleanup(
    subscribeClock((from, to) => {
      if (cursor < from) cursor = from;
      let guard = 0;
      while (cursor < to && guard++ < 300) {
        if (cursor > strokeEnd) {
          cursor += rand(0.15, 1.6);
          strokeEnd = cursor + rand(0.2, 1.1);
          continue;
        }
        transient(ctx, bus, cursor, {
          freq: rand(2500, 7000),
          q: rand(1.2, 3),
          dur: rand(0.02, 0.06),
          gain: rand(0.006, 0.02),
          pan: rand(-0.2, 0.2),
        });
        cursor += rand(0.02, 0.06);
      }
    }),
  );

  // A page turned, now and then.
  const st: PoissonState = { next: 0 };
  r.cleanup(
    subscribeClock((from, to) => {
      poisson(st, from, to, 1 / 25, (t) => {
        for (let i = 0; i < 26; i++) {
          transient(ctx, bus, t + i * rand(0.004, 0.022), {
            freq: rand(1500, 6000),
            q: rand(1, 3),
            dur: rand(0.01, 0.05),
            gain: rand(0.01, 0.04),
            pan: rand(-0.4, 0.4),
          });
        }
      });
    }),
  );

  return r.finish();
}

function heartbeat(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.7);
  bus.connect(filt(ctx, "lowpass", 180, 0.9)).connect(out);

  const thump = (t: number, amp: number) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(74, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.4);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  };

  let next = 0;
  let bpm = 62;
  r.cleanup(
    subscribeClock((from, to) => {
      if (next < from) next = from + 0.2;
      let guard = 0;
      while (next < to && guard++ < 10) {
        // Lub, then dub: the two valve closures, not one beat.
        thump(next, 0.5);
        thump(next + rand(0.22, 0.28), 0.32);
        // Heart rate varies with the breath. A perfectly even pulse is a
        // machine, and reads as alarming rather than calming.
        bpm += rand(-1.2, 1.2);
        bpm = Math.max(52, Math.min(72, bpm));
        next += 60 / bpm;
      }
    }),
  );

  return r.finish();
}

/* ------------------------------------------------------------------ */
/* more noise colours                                                  */
/* ------------------------------------------------------------------ */

/** Blue and violet noise: white tilted upward. Bright, masks keyboard clatter. */
function tiltedNoise(dir: "up" | "down", slope: number, level: number): Voice {
  const r = rig();
  const { ctx, out } = r;
  const src = r.own(noiseSource(ctx, dir === "up" ? "white" : "brown"));
  let node: AudioNode = src;
  for (let i = 0; i < slope; i++) {
    node = node.connect(filt(ctx, dir === "up" ? "highshelf" : "lowshelf", 1000, 0.7));
    (node as BiquadFilterNode).gain.value = 6;
  }
  node.connect(gain(ctx, level)).connect(out);
  src.start(0, randomOffset(src.buffer!));
  return r.finish();
}

/** Green noise: energy concentrated around 500 Hz, near the centre of hearing. */
function greenNoise(): Voice {
  const r = rig();
  const { ctx, out } = r;
  const src = r.own(noiseSource(ctx, "pink"));
  src
    .connect(filt(ctx, "bandpass", 500, 0.65))
    .connect(gain(ctx, 0.9))
    .connect(out);
  src.start(0, randomOffset(src.buffer!));
  return r.finish();
}

/** A low sustained drone. The closest thing here to just sitting still. */
function drone(root: number): Voice {
  const r = rig();
  const { ctx, out } = r;
  const bus = gain(ctx, 0.35);
  bus.connect(filt(ctx, "lowpass", 2400, 0.7)).connect(out);

  // Root, fifth and octave, each slightly detuned and slowly drifting, which
  // produces beating that never settles into a pattern.
  for (const ratio of [1, 1, 1.5, 2, 3]) {
    for (const detune of [-4, 5]) {
      const o = ctx.createOscillator();
      o.type = ratio === 1 ? "sawtooth" : "sine";
      o.frequency.value = root * ratio;
      o.detune.value = detune * rand(0.6, 1.5);
      const g = gain(ctx, 0.1 / ratio);
      const drift = r.own(slowRandomLfo(ctx, 200, 0.04));
      drift.connect(gain(ctx, 7)).connect(o.detune);
      drift.start();
      o.connect(filt(ctx, "lowpass", 900 * ratio, 1.2)).connect(g).connect(bus);
      o.start();
      r.own(o);
    }
  }

  const air = r.own(noiseSource(ctx, "pink"));
  air.connect(filt(ctx, "bandpass", 1800, 0.5)).connect(gain(ctx, 0.02)).connect(out);
  air.start(0, randomOffset(air.buffer!));

  return r.finish();
}

/* ------------------------------------------------------------------ */

export const EXTENDED_VOICES: Record<string, () => Voice> = {
  "rain-tent": () => rainOnSurface({ resonance: 230, bright: 5200, rate: 26 }),
  "rain-leaves": () => rainOnSurface({ resonance: 1800, bright: 9000, rate: 40 }),
  "cave-drip": () => drips({ rate: 0.8, space: 0.21 }),
  waterfall: () => waterfall(),
  rapids: () => rapids(),
  underwater: () => underwater(),
  kettle: () => kettle(),
  blizzard: () => blizzard(),
  leaves: () => leaves(),
  cicadas: () => cicadas(),
  frogs: () => frogs(),
  owls: () => owls(),
  "temple-bell": () => templeBell(),
  gong: () => gong(),
  flute: () => flute(),
  rainstick: () => rainstick(),
  clock: () => clock(),
  fridge: () => fridge(),
  washing: () => washing(),
  train: () => train(),
  traffic: () => traffic(),
  paper: () => paper(),
  heartbeat: () => heartbeat(),
  "noise-blue": () => tiltedNoise("up", 2, 0.12),
  "noise-green": () => greenNoise(),
  "drone-low": () => drone(55),
  "drone-high": () => drone(110),
};

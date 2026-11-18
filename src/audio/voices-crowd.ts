/**
 * Rooms with people in them.
 *
 * Crowd noise is the sound people most often want and the one that is most
 * annoying to ship as a recording: a cafe loop gives itself away within about
 * ninety seconds, because you start recognising individual laughs, and once
 * you have heard the loop you cannot stop hearing it.
 *
 * So it is synthesised, the same way the voice in the music deck is. Each
 * speaker is a source driven through a bank of three formant resonances whose
 * centres jump between vowels at syllable rate, gated by an envelope that
 * talks for a few seconds and then pauses. Eight of those, panned around a
 * room, is indistinguishable from a recording of a room, and it never repeats.
 *
 * The thing that actually sells it is the rhythm, not the timbre: speech sits
 * at roughly four syllables a second, and anything modulated at that rate
 * reads to the ear as talking even when no word is recoverable.
 */

import { getContext, rand, randInt, pick } from "./engine";
import { noiseSource, randomOffset, slowRandomLfo } from "./noise";
import { subscribeClock, poisson, type PoissonState } from "./clock";
import { rig, filt, gain, transient, partial, type Voice } from "./voices";

/** Vowel formant triples, Hz. The first two carry nearly all the identity. */
const VOWEL_FORMANTS: [number, number, number][] = [
  [730, 1090, 2440], // ah
  [270, 2290, 3010], // ee
  [300, 870, 2240], // oo
  [530, 1840, 2480], // eh
  [570, 840, 2410], // aw
  [440, 1020, 2240], // uh
  [660, 1720, 2410], // ae
];

type SpeakerOpts = {
  /** Vocal pitch in Hz. Lower reads as male, higher as female or a child. */
  f0: number;
  pan: number;
  /** Mean seconds of talking before a pause. */
  phrase: number;
  /** Mean seconds of pause. */
  pause: number;
  /** Syllables per second. Real speech sits near 4. */
  rate: number;
  level: number;
};

/**
 * One talker. Persistent nodes, with the envelope and the vowel changes
 * written ahead into the clock window as AudioParam automation, so the whole
 * speaker costs about seven nodes no matter how long it runs.
 */
function speaker(ctx: AudioContext, dest: AudioNode, o: SpeakerOpts) {
  // Voiced energy. A sawtooth through the formants is a crude but effective
  // stand-in for a glottal pulse train.
  const glottis = ctx.createOscillator();
  glottis.type = "sawtooth";
  glottis.frequency.value = o.f0;

  // Unvoiced energy: every other consonant, and most of what survives being
  // heard across a room.
  const breath = noiseSource(ctx, "pink");

  const voicedGain = gain(ctx, 0.5);
  const breathGain = gain(ctx, 0.5);
  glottis.connect(voicedGain);
  breath.connect(breathGain);

  // The syllable gate. Everything downstream is silent unless this is open.
  const env = ctx.createGain();
  env.gain.value = 0;
  voicedGain.connect(env);
  breathGain.connect(env);

  const pan = ctx.createStereoPanner();
  pan.pan.value = o.pan;

  const outGain = gain(ctx, o.level);
  pan.connect(outGain).connect(dest);

  // Three formants in parallel. Their centres are what change per syllable.
  const formants = [0, 1, 2].map((i) => {
    const f = filt(ctx, "bandpass", VOWEL_FORMANTS[0][i], i === 0 ? 7 : 9);
    const g = gain(ctx, i === 0 ? 1 : i === 1 ? 0.5 : 0.18);
    env.connect(f).connect(g).connect(pan);
    return f;
  });

  // Intonation. A monotone speaker is instantly a robot; a slow drift of a
  // few semitones across a phrase is most of what makes it human.
  const intonation = slowRandomLfo(ctx, 90, 0.35);
  const intonationAmt = gain(ctx, o.f0 * 0.14);
  intonation.connect(intonationAmt).connect(glottis.frequency);

  glottis.start();
  breath.start(0, randomOffset(breath.buffer!));
  intonation.start();

  /* --- the talking --------------------------------------------------- */

  let cursor = 0;
  let speakingUntil = 0;
  let silentUntil = 0;

  const fill = (from: number, to: number) => {
    if (cursor < from) {
      cursor = from;
      speakingUntil = 0;
      silentUntil = 0;
    }
    let guard = 0;
    while (cursor < to && guard++ < 200) {
      if (cursor < silentUntil) {
        cursor = silentUntil;
        continue;
      }
      if (cursor >= speakingUntil) {
        // Finished a phrase. Take a breath.
        speakingUntil = cursor + o.phrase * rand(0.45, 1.8);
        silentUntil = speakingUntil + o.pause * rand(0.4, 2.2);
        continue;
      }

      // One syllable.
      const dur = (1 / o.rate) * rand(0.6, 1.5);
      const open = dur * rand(0.35, 0.6);
      const peak = rand(0.35, 1);

      env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), cursor);
      env.gain.linearRampToValueAtTime(peak, cursor + open * 0.35);
      env.gain.linearRampToValueAtTime(peak * rand(0.5, 0.9), cursor + open);
      env.gain.linearRampToValueAtTime(0.0001, cursor + dur * 0.92);

      // Voiced or unvoiced. Roughly a fifth of speech sound is unvoiced, and
      // that fifth is what gives a crowd its hiss.
      const unvoiced = Math.random() < 0.22;
      voicedGain.gain.setValueAtTime(unvoiced ? 0.05 : 0.5, cursor);
      breathGain.gain.setValueAtTime(unvoiced ? 0.9 : 0.14, cursor);

      // Move to the next vowel. Ramped rather than stepped, because formants
      // glide; stepping them sounds like a vocoder.
      const v = pick(VOWEL_FORMANTS);
      formants.forEach((f, i) => {
        f.frequency.setTargetAtTime(v[i] * rand(0.94, 1.06), cursor, 0.02);
      });

      cursor += dur;
    }
  };

  const unsub = subscribeClock(fill);

  return () => {
    unsub();
    try {
      glottis.stop();
      breath.stop();
      intonation.stop();
    } catch {
      /* already stopped */
    }
    for (const n of [glottis, breath, intonation, intonationAmt, voicedGain, breathGain, env, pan, outGain, ...formants]) {
      n.disconnect();
    }
  };
}

type CrowdOpts = {
  voices: number;
  /** Lowpass on the whole room. Lower reads as further away or through a wall. */
  tone: number;
  /** Cups, cutlery, chairs. */
  clinkRate: number;
  level: number;
  /** Mean seconds of talking per phrase. Busier rooms interrupt more. */
  phrase?: number;
  pause?: number;
  /** Room tone and air handling under everything. */
  roomTone?: number;
  espresso?: boolean;
  /** Occasional laugh. */
  laughter?: number;
};

function crowd(o: CrowdOpts): Voice {
  const r = rig();
  const { ctx, out } = r;

  const room = gain(ctx, o.level);
  room.connect(filt(ctx, "lowpass", o.tone, 0.7)).connect(out);

  // A faint plate-like tail so the voices sit in a space rather than on top
  // of your ears. Two short delays are enough at this level.
  for (const [time, g] of [
    [0.037, 0.18],
    [0.061, 0.12],
  ] as const) {
    const d = ctx.createDelay(0.2);
    d.delayTime.value = time;
    const fb = gain(ctx, 0.28);
    const send = gain(ctx, g);
    room.connect(send).connect(d).connect(fb).connect(d);
    d.connect(filt(ctx, "lowpass", 2200, 0.7)).connect(out);
  }

  const stops: (() => void)[] = [];
  for (let i = 0; i < o.voices; i++) {
    // Mix of vocal ranges, weighted the way a real room is.
    const low = Math.random() < 0.45;
    stops.push(
      speaker(ctx, room, {
        f0: low ? rand(88, 135) : rand(165, 245),
        pan: rand(-0.95, 0.95),
        phrase: o.phrase ?? rand(2, 5),
        pause: o.pause ?? rand(1.5, 5),
        rate: rand(3.2, 5.4),
        // Nearer talkers are louder, and a room is mostly far talkers.
        level: (0.1 + Math.pow(Math.random(), 2.2) * 0.5) * rand(0.7, 1.2),
      }),
    );
  }
  r.cleanup(() => stops.forEach((s) => s()));

  // Room tone: air handling, the building itself.
  if (o.roomTone !== 0) {
    const tone = r.own(noiseSource(ctx, "brown"));
    tone.connect(filt(ctx, "lowpass", 420, 0.6)).connect(gain(ctx, o.roomTone ?? 0.14)).connect(out);
    tone.start(0, randomOffset(tone.buffer!));
  }

  // Crockery, cutlery, chair legs.
  if (o.clinkRate > 0) {
    const clinks = gain(ctx, 0.55);
    clinks.connect(out);
    const st: PoissonState = { next: 0 };
    r.cleanup(
      subscribeClock((from, to) => {
        poisson(st, from, to, o.clinkRate, (t) => {
          const pan = rand(-0.8, 0.8);
          const kind = Math.random();
          if (kind < 0.55) {
            // Ceramic or glass: a short ring with a couple of inharmonic partials.
            const f = rand(1600, 4200);
            [1, 2.4, 4.1].forEach((k, i) =>
              partial(ctx, clinks, t, f * k, (0.045 / (i + 1.5)) * rand(0.5, 1.4), rand(0.08, 0.45) / (i + 1), pan),
            );
          } else if (kind < 0.85) {
            // Cutlery on a plate.
            transient(ctx, clinks, t, { freq: rand(2600, 6500), q: rand(3, 9), dur: rand(0.01, 0.04), gain: rand(0.02, 0.07), pan });
          } else {
            // A chair, or something set down on a table.
            transient(ctx, clinks, t, { freq: rand(140, 420), q: rand(2, 6), dur: rand(0.06, 0.2), gain: rand(0.03, 0.09), pan });
          }
        });
      }),
    );
  }

  // The espresso machine: a steam wand, then the grinder, then nothing for a while.
  if (o.espresso) {
    const bus = gain(ctx, 0.5);
    bus.connect(out);
    const st: PoissonState = { next: 0 };
    r.cleanup(
      subscribeClock((from, to) => {
        poisson(st, from, to, 1 / 38, (t) => {
          const steam = Math.random() < 0.55;
          const dur = steam ? rand(3, 7) : rand(1.5, 3.5);
          const src = ctx.createBufferSource();
          src.buffer = noiseSource(ctx, "white").buffer;
          src.loop = true;
          const f = filt(ctx, steam ? "highpass" : "bandpass", steam ? 3200 : 900, steam ? 0.7 : 2.5);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(steam ? 0.05 : 0.09, t + 0.12);
          g.gain.setValueAtTime(steam ? 0.05 : 0.09, t + dur - 0.3);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          if (!steam) {
            // A grinder wobbles as the burrs load up.
            f.frequency.setValueAtTime(900, t);
            f.frequency.linearRampToValueAtTime(rand(600, 1300), t + dur);
          }
          const p = ctx.createStereoPanner();
          p.pan.value = rand(-0.5, 0.5);
          src.connect(f).connect(g).connect(p).connect(bus);
          src.start(t, randomOffset(src.buffer!));
          src.stop(t + dur + 0.2);
          src.onended = () => {
            src.disconnect();
            f.disconnect();
            g.disconnect();
            p.disconnect();
          };
        });
      }),
    );
  }

  // Laughter: a run of five or six voiced pulses on a falling pitch.
  if (o.laughter) {
    const bus = gain(ctx, 0.6);
    bus.connect(out);
    const st: PoissonState = { next: 0 };
    r.cleanup(
      subscribeClock((from, to) => {
        poisson(st, from, to, o.laughter!, (t) => {
          const f0 = rand(180, 330);
          const pan = rand(-0.8, 0.8);
          const n = randInt(4, 7);
          for (let i = 0; i < n; i++) {
            const at = t + i * rand(0.13, 0.2);
            const f = f0 * Math.pow(0.94, i);
            [1, 2, 3].forEach((k, j) =>
              partial(ctx, bus, at, f * k * rand(0.98, 1.02), (0.05 / (j + 1.6)) * rand(0.6, 1.3), rand(0.07, 0.14), pan),
            );
            transient(ctx, bus, at, { freq: rand(700, 1600), q: 2.5, dur: 0.05, gain: 0.015, pan });
          }
        });
      }),
    );
  }

  return r.finish();
}

/* ------------------------------------------------------------------ */

export const CROWD_VOICES: Record<string, () => Voice> = {
  "crowd-cafe": () =>
    crowd({ voices: 7, tone: 4200, clinkRate: 1.1, level: 0.5, roomTone: 0.12, espresso: true, laughter: 1 / 55 }),
  "crowd-restaurant": () =>
    crowd({ voices: 11, tone: 3600, clinkRate: 2.6, level: 0.55, roomTone: 0.16, laughter: 1 / 30, phrase: 2.6, pause: 2 }),
  "crowd-bar": () =>
    crowd({ voices: 14, tone: 3000, clinkRate: 1.8, level: 0.6, roomTone: 0.2, laughter: 1 / 18, phrase: 2.2, pause: 1.6 }),
  "crowd-market": () =>
    crowd({ voices: 13, tone: 5200, clinkRate: 0.6, level: 0.55, roomTone: 0.1, laughter: 1 / 40, phrase: 3.4, pause: 2.4 }),
  "crowd-office": () =>
    crowd({ voices: 4, tone: 3400, clinkRate: 0.35, level: 0.32, roomTone: 0.22, phrase: 3.5, pause: 9 }),
  "crowd-lobby": () =>
    // Through a wall, or from the far end of a hall: all the rhythm, none of
    // the consonants.
    crowd({ voices: 9, tone: 900, clinkRate: 0.25, level: 0.6, roomTone: 0.24, phrase: 3, pause: 3.5 }),
  "crowd-library": () =>
    crowd({ voices: 2, tone: 2600, clinkRate: 0.12, level: 0.18, roomTone: 0.3, phrase: 1.6, pause: 22 }),
};

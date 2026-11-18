/**
 * The music deck.
 *
 * Two modes share one composer. Lofi gets a kit, a Rhodes and a laid-back
 * feel; classical gets strings, harp, piano and an operatic voice, and moves
 * through functional harmony instead of sitting on a loop.
 *
 * The composer is deliberately conservative. Over four hours, surprise is a
 * liability: anything that makes you look up is a failure. What it varies is
 * density, register and arrangement, so the music changes constantly without
 * ever producing a moment.
 */

import { getContext, rand, randInt, pick } from "../engine";
import { subscribeClock } from "../clock";
import { createTape, type Tape } from "./tape";
import {
  PROGRESSIONS,
  CLASSICAL_PROGRESSIONS,
  PENTATONIC,
  SCALES,
  QUALITY,
  voice,
  type Progression,
} from "./theory";
import {
  rhodes,
  piano,
  choir,
  strings,
  harp,
  bass,
  kick,
  snare,
  hat,
  brush,
  type Note,
  type Vowel,
} from "./instruments";

export type DeckMode = "lofi" | "classical";

export type NowPlaying = {
  key: string;
  progression: string;
  bpm: number;
  bar: number;
  mode: DeckMode;
};

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export type Deck = {
  out: AudioNode;
  nowPlaying(): NowPlaying;
  /** Jump to a fresh key and progression without stopping. */
  reroll(): void;
  dispose(): void;
};

export function createDeck(mode: DeckMode): Deck {
  const ctx = getContext();
  const out = ctx.createGain();

  const tape: Tape = createTape(ctx, {
    wear: mode === "lofi" ? 0.75 : 0.3,
    crackle: mode === "lofi" ? 0.6 : 0.25,
    tone: mode === "lofi" ? 8200 : 12000,
    wow: mode === "lofi" ? 1 : 0.45,
  });
  tape.output.connect(out);

  // A long, dark reverb, faked with a decaying-noise impulse. A real one would
  // be a 300 kB file; this is two lines and indistinguishable once it is sitting
  // at fifteen percent behind rain.
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, mode === "classical" ? 3.6 : 2.0, mode === "classical" ? 2.4 : 3.2);
  const verbSend = ctx.createGain();
  verbSend.gain.value = mode === "classical" ? 0.3 : 0.18;
  const verbReturn = ctx.createGain();
  verbReturn.gain.value = 1;
  verbSend.connect(verb).connect(verbReturn).connect(tape.input);

  /** Everything melodic goes through here so it gets both tape and reverb. */
  const dry = tape.input;
  const wet = verbSend;
  const dest = {
    ctx,
    dest: fanOut(ctx, [dry, wet]),
  };
  // Drums stay out of the reverb send, which keeps the kit tight and dry.
  const drumDest = { ctx, dest: dry as AudioNode };

  /* --- composer state --------------------------------------------- */

  const bank = mode === "lofi" ? PROGRESSIONS : CLASSICAL_PROGRESSIONS;
  let prog: Progression = pick(bank);
  let root = randInt(mode === "lofi" ? 53 : 50, mode === "lofi" ? 60 : 57); // F3..C4 / D3..A3
  let bpm = mode === "lofi" ? rand(68, 84) : rand(54, 72);
  let swing = mode === "lofi" ? rand(0.54, 0.6) : 0.5;

  let bar = 0;
  let chordIdx = 0;
  let barInChord = 0;
  let cycles = 0;
  let nextBar = 0;

  /** Arrangement density, 0..1, which drifts over the session. */
  let density = 0.6;
  let drumsOn = mode === "lofi";
  let voiceOn = mode === "classical";

  const scale = SCALES[prog.mode];
  void scale;

  function chord() {
    return prog.chords[chordIdx];
  }

  function advance() {
    barInChord++;
    if (barInChord >= chord().bars) {
      barInChord = 0;
      chordIdx++;
      if (chordIdx >= prog.chords.length) {
        chordIdx = 0;
        cycles++;
        onCycle();
      }
    }
  }

  function onCycle() {
    // Every few cycles, change something. Not everything at once: a wholesale
    // change reads as a new track starting, and there are no tracks here.
    const roll = Math.random();
    if (cycles % 4 === 0 && roll < 0.55) {
      // Move to a closely related key. Fourths and fifths only, so it never
      // lurches.
      root += pick([5, -5, 7, -7, 2, -2]);
      if (root > 62) root -= 12;
      if (root < 48) root += 12;
    }
    if (cycles % 6 === 0 && roll > 0.4) {
      prog = pick(bank);
      chordIdx = 0;
      barInChord = 0;
    }
    if (cycles % 3 === 0) {
      density = Math.max(0.25, Math.min(1, density + rand(-0.3, 0.3)));
      if (mode === "lofi") drumsOn = Math.random() > 0.18;
      if (mode === "classical") voiceOn = Math.random() > 0.3;
    }
    bpm += rand(-0.6, 0.6);
    bpm = Math.max(mode === "lofi" ? 66 : 52, Math.min(mode === "lofi" ? 86 : 74, bpm));
  }

  /* --- note helpers ----------------------------------------------- */

  function chordRoot() {
    return root + chord().degree;
  }

  function chordTones(centre: number) {
    return voice(chordRoot(), chord().quality, centre);
  }

  function fullChord(centre: number) {
    const tones = QUALITY[chord().quality];
    return tones.map((s) => {
      let n = chordRoot() + s;
      while (n < centre - 8) n += 12;
      while (n > centre + 8) n -= 12;
      return n;
    });
  }

  function melodyNote(near: number) {
    const pent = PENTATONIC[prog.mode];
    const semi = pick(pent);
    let n = root + chord().degree + semi;
    while (n < near - 6) n += 12;
    while (n > near + 6) n -= 12;
    return n;
  }

  /** Humanise: a few milliseconds of slop is the difference between a player and a grid. */
  const j = (amount = 0.012) => rand(-amount, amount);

  /* --- the bar ----------------------------------------------------- */

  function scheduleBar(t0: number) {
    const beat = 60 / bpm;
    const eighth = beat / 2;
    const swingOffset = (swing - 0.5) * 2 * eighth * 0.5;
    const pos = (beats: number) => t0 + beats * beat;
    /** Swung eighth: odd eighths land late. */
    const eigh = (i: number) => t0 + i * eighth + (i % 2 ? swingOffset : 0);

    const phraseStart = bar % 4 === 0;
    const lastBarOfPhrase = bar % 4 === 3;

    if (mode === "lofi") {
      if (drumsOn) {
        // Kick on 1, plus one syncopated placement that changes with density.
        kick(drumDest, pos(0) + j(0.006), rand(0.85, 1));
        tape.duck(pos(0), 0.3);
        if (density > 0.4) {
          const k2 = pick([2.5, 2.75, 3.5]);
          kick(drumDest, pos(k2) + j(0.01), rand(0.6, 0.85));
          tape.duck(pos(k2), 0.2);
        }
        // Snare behind the beat, which is the entire feel of the genre.
        snare(drumDest, pos(1) + 0.022 + j(0.008), rand(0.8, 1));
        snare(drumDest, pos(3) + 0.022 + j(0.008), rand(0.8, 1));
        if (density > 0.75 && Math.random() < 0.3) {
          snare(drumDest, pos(3.75) + j(0.01), 0.4);
        }
        for (let i = 0; i < 8; i++) {
          if (Math.random() > 0.12 * (1 - density) + 0.06) {
            hat(drumDest, eigh(i) + j(0.008), rand(0.5, 1) * (i % 2 ? 0.7 : 1), i === 7 && Math.random() < 0.3);
          }
        }
      }

      // Bass: root on the downbeat, a tail into the next chord at phrase ends.
      bass(dest, { midi: chordRoot() - 12, at: pos(0) + j(0.008), dur: beat * 1.6, vel: rand(0.8, 1) });
      if (density > 0.5) {
        bass(dest, { midi: chordRoot() - 12 + pick([0, 7, 10, 3]), at: pos(2.5) + j(0.012), dur: beat * 0.8, vel: rand(0.5, 0.75) });
      }

      // Rhodes: a stab on 1, laid back, sometimes answered on the and of 2.
      const v = chordTones(63 + randInt(-2, 3));
      const stab = (at: number, vel: number) =>
        v.forEach((m, i) =>
          rhodes(dest, { midi: m, at: at + i * rand(0.004, 0.016), dur: beat * rand(1.2, 2.4), vel: vel * rand(0.85, 1) }),
        );
      stab(pos(0) + 0.03 + j(), rand(0.6, 0.85));
      if (density > 0.55 && Math.random() < 0.6) stab(pos(2.5) + 0.03 + j(), rand(0.35, 0.55));

      // Melody: sparse, and silent for whole phrases.
      if (density > 0.45 && Math.random() < 0.45) {
        let m = 72;
        const n = randInt(2, 4);
        for (let i = 0; i < n; i++) {
          m = melodyNote(m);
          rhodes(dest, { midi: m, at: eigh(randInt(0, 7)) + j(), dur: beat * rand(0.5, 1.4), vel: rand(0.35, 0.6) });
        }
      }

      // A distant voice, very occasionally, holding one note over the chord.
      if (Math.random() < 0.08 && phraseStart) {
        const tones = fullChord(72);
        choir(dest, { midi: pick(tones), at: pos(0) + rand(0, 0.2), dur: beat * rand(2, 4), vel: 0.35 }, { vowel: "oo", breath: 0.04 });
      }
    } else {
      /* --- classical ------------------------------------------------ */

      // Strings hold the harmony for the whole bar, entering a touch late so
      // the bow has somewhere to start.
      const held = fullChord(60);
      held.forEach((m, i) =>
        strings(dest, { midi: m, at: t0 + rand(0.01, 0.09) + i * 0.012, dur: beat * 3.9, vel: rand(0.6, 0.85) * (0.5 + density * 0.5) }),
      );

      // Double bass on the root, long.
      bass(dest, { midi: chordRoot() - 24 + 12, at: t0 + j(0.02), dur: beat * 3.8, vel: rand(0.6, 0.85) });

      if (density > 0.4) {
        // Alberti figure: the left hand of every classical keyboard piece.
        const a = fullChord(60).slice(0, 3).sort((x, y) => x - y);
        const pattern = [a[0], a[2], a[1], a[2]];
        for (let i = 0; i < 8; i++) {
          piano(dest, { midi: pattern[i % 4] + (i >= 4 ? 0 : 0), at: eigh(i) + j(0.01), dur: eighth * 1.1, vel: rand(0.3, 0.5) });
        }
      } else if (Math.random() < 0.5) {
        // Or block chords, placed on the strong beats only.
        fullChord(64).forEach((m, i) =>
          piano(dest, { midi: m, at: pos(0) + i * 0.02 + j(), dur: beat * 2, vel: rand(0.35, 0.55) }),
        );
      }

      // Harp sweeps up through the chord at the start of a phrase.
      if (phraseStart && Math.random() < 0.7) {
        const sweep = fullChord(64);
        const all = [...sweep, ...sweep.map((m) => m + 12)].sort((x, y) => x - y);
        all.forEach((m, i) => harp(dest, { midi: m, at: t0 + i * rand(0.055, 0.085), dur: 0.02, vel: rand(0.4, 0.7) }));
      }

      // The voice. One line, moving to a chord tone each bar, suspending into
      // the next one at phrase ends, which is the whole expressive device.
      if (voiceOn) {
        const tones = fullChord(72).filter((m) => m >= 65 && m <= 81);
        const target = tones.length ? pick(tones) : 72;
        const vowel: Vowel = pick(["ah", "ah", "oo", "eh"]);
        if (lastBarOfPhrase && Math.random() < 0.6) {
          // Suspend across the bar line and resolve down a step.
          choir(dest, { midi: target, at: pos(0) + rand(0, 0.12), dur: beat * 3.2, vel: rand(0.55, 0.8) }, { vowel, pan: rand(-0.2, 0.2) });
          choir(dest, { midi: target - pick([1, 2]), at: pos(3.2), dur: beat * 1.6, vel: rand(0.5, 0.7) }, { vowel, pan: rand(-0.2, 0.2) });
        } else {
          choir(dest, { midi: target, at: pos(0) + rand(0, 0.15), dur: beat * rand(2.4, 3.8), vel: rand(0.5, 0.8) }, { vowel, pan: rand(-0.25, 0.25) });
        }
        // A second voice a third or sixth below, some of the time.
        if (density > 0.6 && Math.random() < 0.5) {
          choir(dest, { midi: target - pick([3, 4, 8, 9]), at: pos(0) + rand(0.05, 0.25), dur: beat * 3, vel: rand(0.3, 0.5) }, { vowel, pan: rand(-0.6, 0.6) });
        }
      }

      // Brushes instead of a kit, and only sometimes.
      if (density > 0.7 && Math.random() < 0.35) {
        brush(drumDest, pos(0) + j(0.02), 0.6);
        brush(drumDest, pos(2) + j(0.02), 0.4);
      }
    }

    bar++;
    advance();
  }

  /* --- clock ------------------------------------------------------- */

  const unsub = subscribeClock((from, to) => {
    if (nextBar === 0) nextBar = from + 0.25;
    const barLen = () => (60 / bpm) * 4;
    let guard = 0;
    while (nextBar < to && guard++ < 16) {
      scheduleBar(nextBar);
      nextBar += barLen();
    }
    // Recover from a suspended context or a sleeping laptop rather than
    // trying to catch up on an hour of missed bars.
    if (nextBar < from) nextBar = from + 0.25;
  });

  return {
    out,
    nowPlaying(): NowPlaying {
      return {
        key: `${NOTE_NAMES[((root % 12) + 12) % 12]} ${prog.mode}`,
        progression: prog.name,
        bpm: Math.round(bpm),
        bar,
        mode,
      };
    },
    reroll() {
      prog = pick(bank);
      root = randInt(mode === "lofi" ? 53 : 50, mode === "lofi" ? 60 : 57);
      bpm = mode === "lofi" ? rand(68, 84) : rand(54, 72);
      chordIdx = 0;
      barInChord = 0;
      cycles = 0;
      density = rand(0.4, 0.8);
    },
    dispose() {
      unsub();
      tape.dispose();
      setTimeout(() => {
        verb.disconnect();
        verbSend.disconnect();
        verbReturn.disconnect();
        out.disconnect();
      }, 800);
    },
  };
}

/* ------------------------------------------------------------------ */

/** Connects one virtual destination to several real ones. */
function fanOut(ctx: AudioContext, targets: AudioNode[]): AudioNode {
  const g = ctx.createGain();
  for (const t of targets) g.connect(t);
  return g;
}

/** Exponentially decaying noise, which is a perfectly serviceable reverb tail. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // A short noise-free head gives the tail a sense of distance.
      const pre = i < ctx.sampleRate * 0.012 ? 0.2 : 1;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * pre;
    }
  }
  return buf;
}

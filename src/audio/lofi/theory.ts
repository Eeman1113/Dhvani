/**
 * Just enough harmony to improvise lofi forever without repeating itself.
 *
 * The aim is not cleverness. Lofi lives on a very small set of moves: minor
 * seventh colour, stepwise bass, a ii V somewhere, and nothing that demands
 * your attention. The generator stays inside that box on purpose, because the
 * music is meant to be furniture.
 */

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Semitone stacks above the chord root. */
export const QUALITY = {
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 11, 14],
  min7: [0, 3, 7, 10],
  min9: [0, 3, 10, 14],
  min11: [0, 3, 10, 17],
  dom7: [0, 4, 10, 14],
  dom9: [0, 4, 10, 14],
  halfDim: [0, 3, 6, 10],
  sus2: [0, 2, 7, 14],
  add9: [0, 4, 7, 14],
  // Plain triads and functional sevenths, for the classical deck. Major
  // sevenths everywhere is what makes something sound like jazz rather than
  // like a nocturne, so the classical progressions mostly avoid them.
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  maj6: [0, 4, 7, 9],
  minMaj7: [0, 3, 7, 11],
} as const;

export type Quality = keyof typeof QUALITY;

export type Chord = {
  /** Semitones above the key root. */
  degree: number;
  quality: Quality;
  /** Bars this chord is held. */
  bars: number;
};

export type Progression = {
  name: string;
  /** Natural minor unless stated. */
  mode: "minor" | "dorian" | "major";
  chords: Chord[];
};

export const PROGRESSIONS: Progression[] = [
  {
    name: "the one everybody uses",
    mode: "minor",
    chords: [
      { degree: 0, quality: "min9", bars: 1 },
      { degree: 5, quality: "min7", bars: 1 },
      { degree: 10, quality: "dom9", bars: 1 },
      { degree: 3, quality: "maj7", bars: 1 },
    ],
  },
  {
    name: "two five one",
    mode: "major",
    chords: [
      { degree: 2, quality: "min7", bars: 1 },
      { degree: 7, quality: "dom9", bars: 1 },
      { degree: 0, quality: "maj9", bars: 1 },
      { degree: 9, quality: "min7", bars: 1 },
    ],
  },
  {
    name: "rainy window",
    mode: "dorian",
    chords: [
      { degree: 0, quality: "min9", bars: 2 },
      { degree: 5, quality: "min11", bars: 2 },
    ],
  },
  {
    name: "late bus",
    mode: "minor",
    chords: [
      { degree: 0, quality: "min7", bars: 1 },
      { degree: 8, quality: "maj7", bars: 1 },
      { degree: 3, quality: "maj9", bars: 1 },
      { degree: 10, quality: "dom7", bars: 1 },
    ],
  },
  {
    name: "soft landing",
    mode: "major",
    chords: [
      { degree: 0, quality: "maj9", bars: 1 },
      { degree: 9, quality: "min9", bars: 1 },
      { degree: 5, quality: "maj7", bars: 1 },
      { degree: 7, quality: "sus2", bars: 1 },
    ],
  },
  {
    name: "four in the morning",
    mode: "minor",
    chords: [
      { degree: 0, quality: "min9", bars: 1 },
      { degree: 10, quality: "maj7", bars: 1 },
      { degree: 8, quality: "maj9", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
    ],
  },
  {
    name: "half asleep",
    mode: "dorian",
    chords: [
      { degree: 0, quality: "min11", bars: 2 },
      { degree: 10, quality: "add9", bars: 1 },
      { degree: 5, quality: "min7", bars: 1 },
    ],
  },
];

export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
} as const;

/** Pentatonic subsets, which is where the melodies actually live. */
export const PENTATONIC = {
  minor: [0, 3, 5, 7, 10],
  dorian: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 7, 9],
} as const;

/**
 * Voice a chord into a narrow register around `centre`.
 *
 * Rootless and tightly spaced. Spread voicings sound grand, and grand is the
 * opposite of what this music is for; keeping everything inside about an
 * octave is what makes it sit behind rain instead of in front of it.
 */
export function voice(rootMidi: number, quality: Quality, centre = 64): number[] {
  const tones = QUALITY[quality];
  const notes: number[] = [];
  for (const semi of tones.slice(1)) {
    let n = rootMidi + semi;
    while (n < centre - 7) n += 12;
    while (n > centre + 7) n -= 12;
    // sus2 stacks a 2nd and a 9th, which fold onto the same pitch. Push the
    // duplicate up an octave rather than dropping it and voicing a triad as
    // two notes.
    if (notes.includes(n)) n += 12;
    notes.push(n);
  }
  return Array.from(new Set(notes)).sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* classical and operatic material                                     */
/* ------------------------------------------------------------------ */

/**
 * Functional progressions rather than loops.
 *
 * These are the shapes that opera and the common practice period actually run
 * on: descending tetrachord grounds, circle of fifths sequences, the
 * Neapolitan leaning into a dominant, and a plain authentic cadence to land on.
 * They move, which is the difference between them and the lofi set.
 */
export const CLASSICAL_PROGRESSIONS: Progression[] = [
  {
    // The lament bass. Dido, the Crucifixus, half of baroque opera.
    name: "lament",
    mode: "minor",
    chords: [
      { degree: 0, quality: "min", bars: 1 },
      { degree: 10, quality: "maj", bars: 1 },
      { degree: 8, quality: "maj", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
    ],
  },
  {
    // A circle of fifths sequence, the engine of every development section.
    name: "circle of fifths",
    mode: "major",
    chords: [
      { degree: 9, quality: "min", bars: 1 },
      { degree: 2, quality: "min7", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
      { degree: 0, quality: "maj", bars: 1 },
    ],
  },
  {
    // The ground that the Canon is built on, and a thousand arias after it.
    name: "ground",
    mode: "major",
    chords: [
      { degree: 0, quality: "maj", bars: 1 },
      { degree: 7, quality: "maj", bars: 1 },
      { degree: 9, quality: "min", bars: 1 },
      { degree: 4, quality: "min", bars: 1 },
      { degree: 5, quality: "maj", bars: 1 },
      { degree: 0, quality: "maj", bars: 1 },
      { degree: 5, quality: "maj", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
    ],
  },
  {
    // The Neapolitan: a flat supertonic leaning its whole weight on the dominant.
    name: "neapolitan",
    mode: "minor",
    chords: [
      { degree: 0, quality: "min", bars: 1 },
      { degree: 5, quality: "min", bars: 1 },
      { degree: 1, quality: "maj", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
    ],
  },
  {
    name: "romantic",
    mode: "minor",
    chords: [
      { degree: 0, quality: "minMaj7", bars: 1 },
      { degree: 8, quality: "maj", bars: 1 },
      { degree: 3, quality: "maj", bars: 1 },
      { degree: 10, quality: "maj", bars: 1 },
      { degree: 5, quality: "min", bars: 1 },
      { degree: 7, quality: "dom7", bars: 2 },
    ],
  },
  {
    // Suspension chain. The whole expressive point is the four three resolution.
    name: "suspension",
    mode: "major",
    chords: [
      { degree: 0, quality: "maj", bars: 1 },
      { degree: 5, quality: "sus4", bars: 1 },
      { degree: 5, quality: "maj", bars: 1 },
      { degree: 7, quality: "sus4", bars: 1 },
      { degree: 7, quality: "dom7", bars: 1 },
      { degree: 0, quality: "maj6", bars: 1 },
    ],
  },
];

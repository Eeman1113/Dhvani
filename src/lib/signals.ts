"use client";

import { useDhvani } from "./store";

/**
 * What the page is currently *about*.
 *
 * The background is not decoration that happens to sit behind the controls.
 * It is the place you have assembled: turn on rain and it rains across the
 * whole page, light a fire and the paper warms from below, add crickets and
 * the sheet goes dark and fireflies come out.
 *
 * To do that, the scene needs to know what is playing in semantic terms, not
 * as a list of sound ids. Each sound contributes to a few of these axes, and
 * the scene reads the axes. Adding a sound later means adding one line here,
 * and the whole atmosphere picks it up.
 */

export type Signal =
  | "rain"
  | "snow"
  | "wind"
  | "fire"
  | "night"
  | "water"
  | "forest"
  | "crowd"
  | "machine"
  | "zen"
  | "indoors";

export type Signals = Record<Signal, number> & {
  /** How much is going on at all, 0..1. Drives overall density and depth. */
  activity: number;
};

/** soundId -> the axes it feeds, and how strongly. */
const CONTRIBUTIONS: Record<string, Partial<Record<Signal, number>>> = {
  "rain-light": { rain: 0.8 },
  "rain-heavy": { rain: 1.2, wind: 0.2 },
  "rain-window": { rain: 0.7, indoors: 0.8 },
  "rain-tent": { rain: 0.9, indoors: 0.5 },
  "rain-leaves": { rain: 0.8, forest: 0.6 },
  thunder: { rain: 0.5, night: 0.3 },
  "rec-thunderstorm": { rain: 1.1, night: 0.3 },

  fire: { fire: 1.2 },
  "rec-fireplace": { fire: 1.1, indoors: 0.6 },

  wind: { wind: 1 },
  "wind-high": { wind: 1.1 },
  blizzard: { wind: 1.1, snow: 1.2 },
  "rec-blizzard": { wind: 1, snow: 1.1 },
  leaves: { wind: 0.7, forest: 1 },
  chimes: { wind: 0.5, zen: 0.4 },
  "rec-wind-chimes": { wind: 0.5, zen: 0.4 },

  waves: { water: 1.2 },
  stream: { water: 0.8, forest: 0.3 },
  rapids: { water: 1 },
  waterfall: { water: 1.1 },
  underwater: { water: 1.3 },
  "cave-drip": { water: 0.6, indoors: 0.7 },
  "rec-harbour-seagulls": { water: 1 },
  "rec-forest-brook": { water: 0.7, forest: 0.8 },

  crickets: { night: 1.1, forest: 0.4 },
  cicadas: { forest: 0.8 },
  frogs: { night: 0.9, water: 0.3 },
  owls: { night: 1, forest: 0.6 },
  "rec-frogs-night": { night: 0.9, water: 0.3 },
  "rec-forest-night": { night: 1, forest: 0.9 },
  "rec-birds-dawn": { forest: 1.1 },
  "rec-birds-dawn-2": { forest: 1 },

  "crowd-cafe": { crowd: 1, indoors: 0.8 },
  "crowd-restaurant": { crowd: 1.1, indoors: 0.9 },
  "crowd-bar": { crowd: 1.2, indoors: 0.9, night: 0.4 },
  "crowd-market": { crowd: 1.1 },
  "crowd-office": { crowd: 0.6, indoors: 1 },
  "crowd-lobby": { crowd: 0.8, indoors: 1 },
  "crowd-library": { crowd: 0.3, indoors: 1 },
  "rec-crowd-cafe": { crowd: 1, indoors: 0.8 },
  "rec-restaurant-chatter": { crowd: 1.1, indoors: 0.9 },
  "rec-coffee-shop": { crowd: 0.9, indoors: 0.9 },
  "rec-market-bazaar": { crowd: 1.1 },
  "rec-library": { crowd: 0.2, indoors: 1 },
  "rec-airport-terminal": { crowd: 0.8, indoors: 0.9, machine: 0.3 },

  bowl: { zen: 1.1 },
  "temple-bell": { zen: 1.2 },
  gong: { zen: 1.2 },
  "shishi-odoshi": { zen: 0.9, water: 0.3 },
  flute: { zen: 1 },
  rainstick: { zen: 0.7 },
  "drone-low": { zen: 0.8 },
  "drone-high": { zen: 0.8 },
  "rec-temple-bells": { zen: 1.1 },
  "rec-church-interior": { zen: 0.8, indoors: 1 },

  fan: { machine: 0.9, indoors: 0.9 },
  cabin: { machine: 1, indoors: 1 },
  fridge: { machine: 0.8, indoors: 1 },
  washing: { machine: 0.9, indoors: 1 },
  kettle: { machine: 0.5, indoors: 1 },
  clock: { indoors: 1 },
  train: { machine: 1.1, indoors: 0.7 },
  traffic: { machine: 0.9 },
  heartbeat: { indoors: 0.5 },
  "keyboard-soft": { indoors: 0.9 },
  "keyboard-tactile": { indoors: 0.9 },
  "keyboard-clicky": { indoors: 0.9 },
  "keyboard-thock": { indoors: 0.9 },
  typewriter: { indoors: 0.9 },
  paper: { indoors: 0.9 },
  "rec-pages-turning": { indoors: 0.9 },
  "rec-pencil-writing": { indoors: 0.9 },
  "rec-clock-ticking": { indoors: 1 },
  "rec-washing-machine": { machine: 0.9, indoors: 1 },
  "rec-refrigerator-hum": { machine: 0.8, indoors: 1 },
  "rec-train-interior": { machine: 1.1, indoors: 0.7 },
  "rec-subway-station": { machine: 1, crowd: 0.4 },
  "rec-city-street": { machine: 1, crowd: 0.4 },
  "rec-airplane-cabin": { machine: 1, indoors: 1 },

  "noise-white": { machine: 0.3 },
  "noise-pink": { machine: 0.3 },
  "noise-brown": { machine: 0.4 },
  "noise-green": { machine: 0.3 },
  "noise-blue": { machine: 0.3 },
};

const EMPTY: Signals = {
  rain: 0, snow: 0, wind: 0, fire: 0, night: 0, water: 0,
  forest: 0, crowd: 0, machine: 0, zen: 0, indoors: 0, activity: 0,
};

/** Mutated in place every frame. Never replaced, so refs stay valid. */
export const signals: Signals = { ...EMPTY };

/** Where the signals are heading. The live values chase these. */
const target: Signals = { ...EMPTY };

const KEYS = Object.keys(EMPTY) as (keyof Signals)[];

/**
 * Recomputes the targets from the mix.
 *
 * Called a few times a second rather than every frame: the mix only changes
 * when somebody moves a fader, and walking a hundred-entry table at 60 Hz for
 * a value that changes once a minute would be silly.
 */
export function refreshSignals() {
  for (const k of KEYS) target[k] = 0;

  const levels = useDhvani.getState().levels;
  let total = 0;
  for (const [id, level] of Object.entries(levels)) {
    if (level <= 0) continue;
    total += level;
    const c = CONTRIBUTIONS[id];
    if (!c) continue;
    for (const [sig, weight] of Object.entries(c)) {
      target[sig as Signal] += level * (weight as number);
    }
  }

  const music = useDhvani.getState().music;
  if (music) total += music.level * 0.8;

  for (const k of KEYS) {
    if (k === "activity") continue;
    // Saturating rather than clipping: two rain sounds should read as more
    // rain than one, but four should not read as four times.
    target[k] = 1 - Math.exp(-target[k] * 1.1);
  }
  target.activity = 1 - Math.exp(-total * 0.5);
}

/** Eases the live values toward the targets. Call once per frame with dt. */
export function stepSignals(dt: number) {
  // Slow on purpose. Weather should arrive over a few seconds, not snap.
  const k = Math.min(1, dt * 0.8);
  for (const key of KEYS) {
    signals[key] += (target[key] - signals[key]) * k;
  }
}

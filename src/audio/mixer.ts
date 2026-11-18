/**
 * The mixer: one fader per sound, plus the lofi deck.
 *
 * Voices are built lazily the first time a sound is raised above zero and torn
 * down a moment after it returns to zero, so a user who only ever plays rain is
 * never paying for seventeen idle synthesis graphs.
 */

import { getContext, getMaster, ramp, faderToGain, resume } from "./engine";
import { SYNTH_VOICES, type Voice } from "./voices";
import { SOUND_BY_ID } from "./catalogue";
import { loadSample } from "./samples";
import { createDeck, type Deck, type DeckMode, type NowPlaying } from "./lofi/engine";

type Channel = {
  voice: Voice | null;
  fader: GainNode;
  level: number;
  teardown: ReturnType<typeof setTimeout> | null;
  loading: boolean;
  /**
   * Bumped on every setLevel call.
   *
   * setLevel awaits twice, so two calls issued in the same task interleave on
   * the microtask queue and can finish out of order. Without this, a quick
   * off-after-on ends with the fader ramped up on a channel the user has
   * already switched off, and the teardown then hard-stops it with a click.
   */
  seq: number;
};

const channels = new Map<string, Channel>();

const FADE = 0.9; // seconds. Long enough that nothing ever appears abruptly.

function channel(id: string): Channel {
  let ch = channels.get(id);
  if (ch) return ch;
  const ctx = getContext();
  const fader = ctx.createGain();
  fader.gain.value = 0;
  fader.connect(getMaster());
  ch = { voice: null, fader, level: 0, teardown: null, loading: false, seq: 0 };
  channels.set(id, ch);
  return ch;
}

async function buildVoice(id: string, ch: Channel) {
  const sound = SOUND_BY_ID[id];
  if (!sound || ch.voice || ch.loading) return;

  if (sound.kind === "synth") {
    const build = SYNTH_VOICES[id];
    if (!build) return;
    ch.voice = build();
    ch.voice.out.connect(ch.fader);
    return;
  }

  ch.loading = true;
  try {
    const voice = await loadSample(sound);
    // The user may have switched it off again while the file was downloading.
    if (ch.level <= 0) {
      voice.dispose();
      return;
    }
    ch.voice = voice;
    voice.out.connect(ch.fader);
  } catch {
    /* a missing file should not take the rest of the mix down */
  } finally {
    ch.loading = false;
  }
}

/** 0 switches the sound off. Everything in between is a fader position. */
export async function setLevel(id: string, level: number) {
  const ch = channel(id);
  const seq = ++ch.seq;
  ch.level = level;

  await resume();
  if (ch.seq !== seq) return;

  if (level > 0) {
    if (ch.teardown) {
      clearTimeout(ch.teardown);
      ch.teardown = null;
    }
    if (!ch.voice) {
      await buildVoice(id, ch);
      if (ch.seq !== seq) return;
    }
    ramp(ch.fader.gain, faderToGain(level), FADE);
  } else {
    ramp(ch.fader.gain, 0, FADE);
    if (ch.teardown) clearTimeout(ch.teardown);
    ch.teardown = setTimeout(() => {
      ch.teardown = null;
      // It may have been switched back on while the fade was running.
      if (ch.level > 0) return;
      ch.voice?.dispose();
      ch.voice = null;
    }, FADE * 1000 + 300);
  }
}

export function stopAll() {
  for (const id of channels.keys()) void setLevel(id, 0);
}


/* ------------------------------------------------------------------ */
/* music deck                                                          */
/* ------------------------------------------------------------------ */


let deck: Deck | null = null;
let deckMode: DeckMode | null = null;
let deckFader: GainNode | null = null;
let deckTeardown: ReturnType<typeof setTimeout> | null = null;

function ensureDeckFader(): GainNode {
  if (deckFader) return deckFader;
  const ctx = getContext();
  deckFader = ctx.createGain();
  deckFader.gain.value = 0;
  deckFader.connect(getMaster());
  return deckFader;
}

/** level 0 stops the deck. Changing mode rebuilds it under a crossfade. */
let musicSeq = 0;

export async function setMusic(mode: DeckMode | null, level: number) {
  const seq = ++musicSeq;
  const fader = ensureDeckFader();
  await resume();
  if (musicSeq !== seq) return;

  if (!mode || level <= 0) {
    ramp(fader.gain, 0, FADE);
    if (deckTeardown) clearTimeout(deckTeardown);
    deckTeardown = setTimeout(() => {
      deck?.dispose();
      deck = null;
      deckMode = null;
      deckTeardown = null;
    }, FADE * 1000 + 400);
    return;
  }

  if (deckTeardown) {
    clearTimeout(deckTeardown);
    deckTeardown = null;
  }

  if (deck && deckMode !== mode) {
    // Fade the old mode out before swapping, so a mode switch is a dissolve
    // rather than a cut.
    const old = deck;
    deck = null;
    ramp(fader.gain, 0, 0.6);
    setTimeout(() => old.dispose(), 900);
    await new Promise((r) => setTimeout(r, 650));
    if (musicSeq !== seq) return;
  }

  if (!deck) {
    deck = createDeck(mode);
    deckMode = mode;
    deck.out.connect(fader);
  }

  ramp(fader.gain, faderToGain(level) * 0.85, FADE);
}

export function musicNowPlaying(): NowPlaying | null {
  return deck?.nowPlaying() ?? null;
}

export function rerollMusic() {
  deck?.reroll();
}

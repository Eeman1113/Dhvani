"use client";

import { useEffect, useState } from "react";
import { Doodle } from "@/components/doodles";
import { RoughBorder } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
import { useDhvani } from "@/lib/store";
import { useMotion } from "@/lib/useMotion";
import { musicNowPlaying, rerollMusic } from "@/audio/mixer";
import type { DeckMode } from "@/audio/lofi/engine";

/**
 * The music deck.
 *
 * Two cards with exactly the grammar of a sound card: a doodle, a name, a
 * gloss, a fader. It used to be one wide panel with its own heading inside a
 * border, which made it a different species from everything around it and
 * left it as the largest and emptiest thing on the page. Music is not a
 * separate apparatus here, it is one more thing you turn on.
 */

const MODES: {
  id: DeckMode;
  name: string;
  jp: string;
  doodle: string;
  blurb: string;
}[] = [
  {
    id: "lofi",
    name: "Lofi",
    jp: "低忠実",
    doodle: "cassette",
    blurb:
      "A kit behind the beat, a Rhodes, and a tape that has been round the heads too many times.",
  },
  {
    id: "classical",
    name: "Nocturne",
    jp: "夜想",
    doodle: "nocturne",
    blurb:
      "Strings, harp and a synthesised voice, moving through lament basses and real cadences.",
  },
];

export function MusicDeck() {
  const music = useDhvani((s) => s.music);
  const setMode = useDhvani((s) => s.setMusicMode);
  const setLevel = useDhvani((s) => s.setMusicLevel);
  const [np, setNp] = useState<ReturnType<typeof musicNowPlaying>>(null);

  useEffect(() => {
    if (!music?.mode) return;
    // Once a second is plenty for a key and a tempo, and keeps this out of
    // the animation budget entirely.
    const id = setInterval(() => setNp(musicNowPlaying()), 1000);
    return () => {
      clearInterval(id);
      setNp(null);
    };
  }, [music?.mode]);

  return (
    <section aria-labelledby="music-heading">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pl-1">
        <h2 id="music-heading" className="hand text-xl leading-none" style={{ color: "var(--ink)" }}>
          Music
        </h2>
        <span className="jp text-sm leading-none" style={{ color: "var(--accent-text)" }}>
          音楽
        </span>
        <span className="basis-full text-[0.78rem] leading-snug sm:basis-auto" style={{ color: "var(--ink-soft)" }}>
          written one bar at a time, about two seconds ahead of what you hear
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m, i) => (
          <ModeCard
            key={m.id}
            mode={m}
            index={i}
            active={music?.mode === m.id}
            level={music?.mode === m.id ? music.level : 0}
            nowPlaying={music?.mode === m.id ? np : null}
            onToggle={() => setMode(music?.mode === m.id ? null : m.id)}
            onLevel={(v) => setLevel(Math.max(0.02, v))}
            onReroll={() => {
              rerollMusic();
              setNp(musicNowPlaying());
            }}
          />
        ))}
      </div>
    </section>
  );
}

function ModeCard({
  mode,
  index,
  active,
  level,
  nowPlaying,
  onToggle,
  onLevel,
  onReroll,
}: {
  mode: (typeof MODES)[number];
  index: number;
  active: boolean;
  level: number;
  nowPlaying: ReturnType<typeof musicNowPlaying>;
  onToggle: () => void;
  onLevel: (v: number) => void;
  onReroll: () => void;
}) {
  const ref = useMotion<HTMLDivElement>({
    active,
    band: mode.id === "lofi" ? "bass" : "mid",
    lift: active ? 5 : 0,
    scale: active ? 0.02 : 0,
    tilt: active ? 0.5 : 0,
    punch: 0.7,
    idle: active ? 1 : 0.55,
    phase: index * 1.4,
  });

  return (
    <div ref={ref} className="relative will-change-transform">
      <div
        className="relative flex gap-4 rounded-[18px] px-4 py-4 transition-colors duration-500"
        style={{ background: active ? "var(--wash)" : "var(--paper-2)" }}
      >
        <RoughBorder
          seedKey={`mode-${mode.id}`}
          radius={18}
          stroke={active ? "var(--accent)" : "var(--ink)"}
          strokeWidth={active ? 2.6 : 1.8}
          opacity={active ? 1 : 0.42}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={active}
          className="relative z-10 flex flex-1 items-start gap-3 text-left"
        >
          <span className="h-14 w-14 shrink-0 transition-opacity duration-500" style={{ opacity: active ? 1 : 0.42 }}>
            <Doodle name={mode.doodle} active={active} id={mode.id} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-1.5">
              <span className="hand text-lg leading-none" style={{ color: "var(--ink)" }}>
                {mode.name}
              </span>
              <span className="jp text-[0.62rem] leading-none" style={{ color: "var(--ink-soft)" }}>
                {mode.jp}
              </span>
            </span>
            <span className="mt-1 block text-[0.74rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
              {active && nowPlaying
                ? `${nowPlaying.key}, ${nowPlaying.bpm} bpm, on "${nowPlaying.progression}". Bar ${nowPlaying.bar}.`
                : active
                  ? "warming up"
                  : mode.blurb}
            </span>
          </span>
        </button>
      </div>

      <div
        className="relative z-10 mt-2 flex items-center gap-3 px-1 transition-opacity duration-500"
        style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
        aria-hidden={!active}
      >
        <span className="flex-1">
          <InkSlider
            value={level}
            dim={!active}
            seed={`music-${mode.id}`}
            label={`${mode.name} volume`}
            onChange={onLevel}
            disabled={!active}
          />
        </span>
        <button
          type="button"
          onClick={onReroll}
          disabled={!active}
          tabIndex={active ? 0 : -1}
          className="hand tap shrink-0 text-[0.8rem] underline-offset-4 hover:underline"
          style={{ color: "var(--accent-text)" }}
          title="New key, new progression, no gap"
        >
          again, differently
        </button>
      </div>
    </div>
  );
}

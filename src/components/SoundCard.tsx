"use client";

import { useState } from "react";
import { Doodle } from "@/components/doodles";
import { RoughBorder } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
import { useDhvani } from "@/lib/store";
import { useLite } from "@/lib/perf";
import { useMotion } from "@/lib/useMotion";
import type { Sound } from "@/audio/catalogue";

export function SoundCard({ sound, index }: { sound: Sound; index: number }) {
  const level = useDhvani((s) => s.levels[sound.id] ?? 0);
  const setSound = useDhvani((s) => s.setSound);
  const active = level > 0;
  // Promoting ninety cards to their own compositor layer is a real cost
  // without a GPU, and it also disables subpixel text antialiasing.
  const lite = useLite();
  const [showNote, setShowNote] = useState(false);

  // The whole card has weight. Active cards ride the mix; idle ones just
  // breathe, with a phase offset so a row never moves in lockstep.
  const ref = useMotion<HTMLDivElement>({
    active,
    band: "rms",
    lift: active ? 5 : 0,
    scale: active ? 0.028 : 0,
    tilt: active ? 0.9 : 0,
    punch: 0.7,
    idle: active ? 1 : 0.55,
    phase: index * 0.7,
  });

  return (
    <div
      ref={ref}
      className={`card-skip relative ${lite ? "" : "will-change-transform"}`}
    >
      <div
        className="relative flex flex-col items-center gap-2 rounded-[18px] px-3 pb-3 pt-4 transition-colors duration-500"
        style={{
          background: active ? "var(--wash)" : "var(--paper-2)",
        }}
      >
        <RoughBorder
          seedKey={sound.id}
          stroke={active ? "var(--accent)" : "var(--ink)"}
          strokeWidth={active ? 2.6 : 1.8}
          opacity={active ? 1 : 0.42}
        />

        <button
          type="button"
          onClick={() => setSound(sound.id, active ? 0 : sound.defaultLevel)}
          className="relative z-10 flex w-full flex-col items-center gap-1.5"
          aria-pressed={active}
          aria-label={`${sound.name}${active ? ", playing" : ""}`}
        >
          <span
            className="h-14 w-14 transition-opacity duration-500"
            style={{ opacity: active ? 1 : 0.42 }}
          >
            <Doodle name={sound.doodle} active={active} id={sound.id} />
          </span>
          <span className="flex flex-wrap items-baseline justify-center gap-x-1.5 leading-tight">
            <span className="hand text-[1.05rem]" style={{ color: "var(--ink)" }}>
              {sound.name}
            </span>
            <span className="jp text-[0.62rem]" style={{ color: "var(--ink-soft)" }}>
              {sound.jp}
            </span>
          </span>
        </button>

        {/*
          Always present, never hidden.
          A control that only exists once the thing is already on means the
          first fader a new visitor sees is no fader at all, and hiding a live
          input is what put eighty of them in the accessibility tree.
          Off cards keep a hairline of the same drawn line.
        */}
        <div className="relative z-10 mt-1 w-full px-1">
          <InkSlider
            value={active ? level : 0}
            dim={!active}
            seed={`slider-${sound.id}`}
            label={`${sound.name} volume`}
            valueText={active ? `${Math.round(level * 100)} percent` : "off"}
            onChange={(v) => setSound(sound.id, v <= 0.02 ? 0 : v)}
          />
        </div>

        {sound.kind === "sample" && (
          // A small ear, marking the handful of sounds that are recordings of
          // a real place rather than synthesis. The credits page says whose.
          <span
            className="absolute left-2 top-2 z-10 text-[0.62rem] leading-none"
            style={{ color: "var(--ink-soft)", opacity: active ? 0.75 : 0.4 }}
            title="A field recording, not synthesised. See the credits page."
          >
            録
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowNote((v) => !v)}
          // 28, not the 44 the other touch targets use. At 44 this square
          // covered the top-right corner of the card including part of the
          // doodle, so a tap meant to turn the sound on opened the note
          // instead, depending on exactly where it landed.
          className="absolute right-0.5 top-0.5 z-20 flex h-7 w-7 items-center justify-center rounded-full text-[0.72rem] leading-none transition-opacity"
          style={{ color: "var(--ink-soft)", opacity: showNote ? 1 : 0.35 }}
          aria-label={`How ${sound.name} is made`}
          aria-expanded={showNote}
          aria-controls={`note-${sound.id}`}
        >
          ?
        </button>

        {showNote && (
          <p
            id={`note-${sound.id}`}
            className="relative z-10 px-1 pt-1 text-center text-[0.7rem] leading-snug"
            style={{ color: "var(--ink-soft)" }}
          >
            {sound.note}
          </p>
        )}
      </div>
    </div>
  );
}

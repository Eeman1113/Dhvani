"use client";

import { useEffect, useState } from "react";
import { RoughBorder } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
import { useDhvani } from "@/lib/store";
import { useMotion } from "@/lib/useMotion";
import { musicNowPlaying, rerollMusic } from "@/audio/mixer";
import type { DeckMode } from "@/audio/lofi/engine";

const MODES: { id: DeckMode; name: string; jp: string; blurb: string }[] = [
  {
    id: "lofi",
    name: "Lofi",
    jp: "低忠実",
    blurb: "a kit, a rhodes and a worn tape, written one bar at a time",
  },
  {
    id: "classical",
    name: "Nocturne",
    jp: "夜想",
    blurb: "strings, harp and a voice, moving through real cadences",
  },
];

/** A small staff of ink that moves with what is being played. */
function Staff({ active }: { active: boolean }) {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 3, scale: 0.05, punch: 1.2 });
  return (
    <svg viewBox="0 0 120 56" className="h-14 w-28 overflow-visible" aria-hidden>
      <g ref={ref}>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M 6 ${14 + i * 9} C 40 ${12 + i * 9}, 80 ${16 + i * 9}, 114 ${13 + i * 9}`}
            stroke="var(--ink)"
            strokeWidth={1}
            fill="none"
            opacity={0.3}
          />
        ))}
        {[18, 44, 66, 92].map((x, i) => (
          <g key={x}>
            <ellipse
              cx={x}
              cy={30 - i * 4}
              rx={5.4}
              ry={4}
              fill="var(--accent)"
              stroke="var(--ink)"
              strokeWidth={1.4}
              transform={`rotate(-20 ${x} ${30 - i * 4})`}
            >
              <animate
                attributeName="cy"
                values={`${30 - i * 4};${24 - i * 4};${30 - i * 4}`}
                dur={`${2 + i * 0.6}s`}
                repeatCount="indefinite"
              />
            </ellipse>
            <line
              x1={x + 5}
              y1={30 - i * 4}
              x2={x + 5}
              y2={12 - i * 4}
              stroke="var(--ink)"
              strokeWidth={1.6}
              strokeLinecap="round"
            >
              <animate
                attributeName="y1"
                values={`${30 - i * 4};${24 - i * 4};${30 - i * 4}`}
                dur={`${2 + i * 0.6}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values={`${12 - i * 4};${6 - i * 4};${12 - i * 4}`}
                dur={`${2 + i * 0.6}s`}
                repeatCount="indefinite"
              />
            </line>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function MusicDeck() {
  const music = useDhvani((s) => s.music);
  const setMode = useDhvani((s) => s.setMusicMode);
  const setLevel = useDhvani((s) => s.setMusicLevel);
  const [np, setNp] = useState<ReturnType<typeof musicNowPlaying>>(null);

  // Once a second is plenty for a key and a tempo, and keeps this out of the
  // animation budget entirely.
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

  const ref = useMotion<HTMLDivElement>({
    active: !!music,
    band: "bass",
    lift: 4,
    scale: 0.016,
    tilt: 0.4,
    punch: 0.8,
  });

  return (
    <div ref={ref} className="relative will-change-transform">
      <div
        className="relative rounded-[22px] px-5 py-5 transition-colors duration-500 sm:px-7"
        style={{ background: music ? "var(--wash)" : "var(--paper-2)" }}
      >
        <RoughBorder
          seedKey="music-deck"
          radius={22}
          stroke={music ? "var(--accent)" : "var(--ink)"}
          strokeWidth={music ? 2.6 : 1.8}
          opacity={music ? 1 : 0.4}
        />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <Staff active={!!music} />
            <div>
              <h2 className="hand text-xl leading-tight" style={{ color: "var(--ink)" }}>
                Music
              </h2>
              <p className="jp text-xs" style={{ color: "var(--accent-text)" }}>
                音楽
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => {
                const on = music?.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(on ? null : m.id)}
                    className="relative px-4 py-2 text-left transition-transform duration-200 active:scale-95"
                    aria-pressed={on}
                  >
                    <RoughBorder
                      seedKey={`mode-${m.id}`}
                      radius={13}
                      stroke={on ? "var(--accent)" : "var(--ink)"}
                      strokeWidth={on ? 2.4 : 1.5}
                      opacity={on ? 1 : 0.4}
                    />
                    <span className="relative z-10 block">
                      <span className="flex items-baseline gap-1.5">
                        <span className="hand text-base" style={{ color: "var(--ink)" }}>
                          {m.name}
                        </span>
                        <span className="jp text-[0.62rem]" style={{ color: "var(--ink-soft)" }}>
                          {m.jp}
                        </span>
                      </span>
                      <span
                        className="mt-0.5 block max-w-[22ch] text-[0.7rem] leading-snug"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        {m.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}

              {music && (
                <button
                  type="button"
                  onClick={() => {
                    rerollMusic();
                    setNp(musicNowPlaying());
                  }}
                  className="relative px-4 py-2 transition-transform duration-200 active:scale-95"
                  title="New key, new progression, no gap"
                >
                  <RoughBorder seedKey="reroll" radius={13} stroke="var(--ink)" strokeWidth={1.5} opacity={0.4} />
                  <span className="hand relative z-10 text-base" style={{ color: "var(--ink-soft)" }}>
                    again, differently
                  </span>
                </button>
              )}
            </div>

            <p className="text-[0.76rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
              {music
                ? np
                  ? `${np.key}, ${np.bpm} bpm, on "${np.progression}". Bar ${np.bar}.`
                  : "warming up"
                : "Written one bar at a time, about two seconds ahead of what you hear."}
            </p>

            {music && (
              <label className="flex items-center gap-3">
                <span className="hand text-sm" style={{ color: "var(--ink-soft)" }}>
                  level
                </span>
                <span className="w-full max-w-xs">
                  <InkSlider
                    value={music.level}
                    onChange={(v) => setLevel(Math.max(0.02, v))}
                    seed="music-level"
                    label="Music volume"
                  />
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

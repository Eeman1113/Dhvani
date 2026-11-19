"use client";

import { useMemo } from "react";
import { hashString, roughFrames, seeded, type Pt } from "@/lib/rough";
import { setTier, useTier } from "@/lib/perf";

/**
 * A drawn switch for the rendering tier.
 *
 * It used to be the words "lite mode is on" sitting in the bar, which both
 * took a lot of room and read as a sentence rather than a control. A switch
 * says the same thing in a shape, and it says it is a thing you can flip.
 */
export function LiteSwitch({ withLabel = false }: { withLabel?: boolean }) {
  const tier = useTier();
  const on = tier === "lite";

  const { track, knob } = useMemo(() => {
    const h = hashString("lite-switch");
    const rnd = seeded(h);
    const pts: Pt[] = [];
    const w = 40;
    const r = 9;
    // a rounded capsule, drawn by hand
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI / 2 + (i / 10) * Math.PI;
      pts.push([r + Math.cos(a) * r, r + Math.sin(a) * r + (rnd() - 0.5)]);
    }
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI;
      pts.push([w - r + Math.cos(a) * r, r + Math.sin(a) * r + (rnd() - 0.5)]);
    }
    return {
      track: roughFrames(pts, h, { amp: 0.6 }),
      knob: roughFrames(
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return [Math.cos(a) * 6.4, Math.sin(a) * 6.4] as Pt;
        }),
        h + 17,
        { amp: 0.7 },
      ),
    };
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setTier(on ? "full" : "lite")}
      className="tap inline-flex shrink-0 items-center gap-2"
      title={
        on
          ? "Lite mode is on: the page draws less. Every sound and both music modes are the same either way. This is not the paper colour."
          : "Lite mode: draw less, for an older machine. Every sound stays exactly the same. This is not the paper colour."
      }
    >
      <svg viewBox="-2 -2 44 22" className="h-[18px] w-[40px] overflow-visible" aria-hidden>
        {track.slice(0, 1).map((paths, i) => (
          <g key={i}>
            {paths.map((d, k) => (
              <path
                key={k}
                d={d}
                fill={k === 0 ? (on ? "var(--wash)" : "none") : "none"}
                stroke={on ? "var(--accent)" : "var(--ink)"}
                strokeWidth={k === 0 ? 1.8 : 1.1}
                strokeLinejoin="round"
                opacity={k === 0 ? (on ? 1 : 0.5) : 0.4}
              />
            ))}
          </g>
        ))}
        <g
          style={{
            transform: `translate(${on ? 31 : 9}px, 9px)`,
            transition: "transform 220ms cubic-bezier(.34,1.3,.64,1)",
          }}
        >
          {knob.slice(0, 1).map((paths, i) => (
            <g key={i}>
              {paths.map((d, k) => (
                <path
                  key={k}
                  d={d}
                  fill={k === 0 ? (on ? "var(--accent)" : "var(--paper-3)") : "none"}
                  stroke="var(--ink)"
                  strokeWidth={k === 0 ? 1.6 : 1}
                  strokeLinejoin="round"
                  opacity={k === 0 ? 1 : 0.45}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <span
        className={`hand text-sm leading-none ${withLabel ? "" : "sr-only"}`}
        style={{ color: on ? "var(--accent-text)" : "var(--ink-soft)" }}
      >
        lite mode
      </span>
    </button>
  );
}

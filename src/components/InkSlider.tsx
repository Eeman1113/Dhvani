"use client";

import { useId, useMemo } from "react";
import { hashString, roughFrames, seeded, type Pt } from "@/lib/rough";

/**
 * The fader.
 *
 * This is the control people actually came here to touch, and for a while it
 * was the one thing on the page that was a plain rectangle: a 4 px grey track
 * with a blob on it, in a design whose whole premise is that nothing is drawn
 * straight. So it is drawn with the same boiling-line machinery as every
 * border and every doodle.
 *
 * A real `<input type="range">` sits on top at zero opacity and does all the
 * work. That is not a shortcut, it is the only way to get the full keyboard
 * model, touch behaviour, IME and screen-reader semantics for free; the SVG
 * underneath is purely what you look at.
 */

const VB_W = 200;
const VB_H = 22;

export function InkSlider({
  value,
  onChange,
  label,
  valueText,
  seed,
  /** Off cards keep a hairline, so the control is always present. */
  dim = false,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  valueText?: string;
  seed: string;
  dim?: boolean;
  disabled?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  // The track is generated once per slider. The value moves a clip rectangle
  // over it rather than regenerating the path, so dragging costs one attribute
  // write and the line never re-sketches itself under your thumb.
  const { track, thumbFrames } = useMemo(() => {
    const h = hashString(seed);
    const rnd = seeded(h);
    const pts: Pt[] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      pts.push([
        4 + (i / n) * (VB_W - 8),
        // Shallow on purpose: the viewBox is stretched horizontally to fit
        // the card, which exaggerates vertical wobble on the way in.
        VB_H / 2 + (rnd() * 2 - 1) * 1.1,
      ]);
    }
    return {
      track: roughFrames(pts, h, { amp: 0.7, closed: false, passes: 1 }),
      thumbFrames: roughFrames(
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return [Math.cos(a) * 7, Math.sin(a) * 7] as Pt;
        }),
        h + 31,
        { amp: 0.9 },
      ),
    };
  }, [seed]);

  const pct = Math.max(0, Math.min(1, value));
  const x = 4 + pct * (VB_W - 8);

  return (
    <div className="relative h-[22px] w-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <clipPath id={`fill-${uid}`} clipPathUnits="userSpaceOnUse">
            <rect x={0} y={0} width={x} height={VB_H} />
          </clipPath>
        </defs>

        {/* the empty part of the run */}
        {track.map((paths, i) => (
          <g key={`t${i}`} className={`boil-${i}`}>
            {paths.map((d, k) => (
              <path
                key={k}
                d={d}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={dim ? 1.1 : 1.6}
                strokeLinecap="round"
                opacity={dim ? 0.22 : 0.3}
              />
            ))}
          </g>
        ))}

        {/* the part you have filled in */}
        {!dim &&
          track.map((paths, i) => (
            <g key={`f${i}`} className={`boil-${i}`} clipPath={`url(#fill-${uid})`}>
              {paths.map((d, k) => (
                <path
                  key={k}
                  d={d}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}
      </svg>

      {/*
        The thumb is in its own SVG so it keeps a real circle: the track's
        viewBox is stretched to the card width, and anything round in there
        would come out an ellipse.
      */}
      {!dim && (
        <svg
          className="pointer-events-none absolute top-1/2 h-5 w-5 overflow-visible"
          style={{ left: `calc(${(pct * 100).toFixed(2)}% )`, transform: "translate(-50%, -50%)" }}
          viewBox="-10 -10 20 20"
          aria-hidden
        >
          {thumbFrames.map((paths, i) => (
            <g key={i} className={`boil-${i}`}>
              {paths.map((d, k) => (
                <path
                  key={k}
                  d={d}
                  fill={k === 0 ? "var(--accent)" : "none"}
                  stroke="var(--ink)"
                  strokeWidth={k === 0 ? 1.7 : 1}
                  strokeLinejoin="round"
                  opacity={k === 0 ? 1 : 0.5}
                />
              ))}
            </g>
          ))}
        </svg>
      )}

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText ?? `${Math.round(pct * 100)} percent`}
        className="bare-range absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

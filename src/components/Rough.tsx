"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  circlePoints,
  hashString,
  roughFrames,
  roundRectPoints,
  type Pt,
} from "@/lib/rough";

type Common = {
  /** Anything stable works. Same key, same wobble, every render. */
  seedKey: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  amp?: number;
  className?: string;
  opacity?: number;
};

function Frames({
  frames,
  stroke,
  fill,
  strokeWidth,
  opacity,
}: {
  frames: string[][];
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
}) {
  return (
    <>
      {frames.map((paths, i) => (
        <g key={i} className={`boil-${i}`} opacity={opacity}>
          {paths.map((d, k) => (
            <path
              key={k}
              d={d}
              fill={k === 0 ? fill : "none"}
              stroke={stroke}
              strokeWidth={strokeWidth * (k === 0 ? 1 : 0.65)}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={k === 0 ? 1 : 0.55}
            />
          ))}
        </g>
      ))}
    </>
  );
}

/** A hand-drawn rounded rectangle, sized in its own SVG user units. */
export function RoughRect({
  w,
  h,
  r = 14,
  seedKey,
  stroke = "var(--ink)",
  fill = "none",
  strokeWidth = 2,
  amp = 1.8,
  opacity = 1,
}: Common & { w: number; h: number; r?: number }) {
  const frames = useMemo(
    () => roughFrames(roundRectPoints(w - 4, h - 4, r), hashString(seedKey), { amp }),
    [w, h, r, seedKey, amp],
  );
  return (
    <g transform="translate(2,2)">
      <Frames frames={frames} stroke={stroke} fill={fill} strokeWidth={strokeWidth} opacity={opacity} />
    </g>
  );
}

export function RoughCircle({
  cx,
  cy,
  r,
  seedKey,
  stroke = "var(--ink)",
  fill = "none",
  strokeWidth = 2,
  amp = 1.5,
  opacity = 1,
}: Common & { cx: number; cy: number; r: number }) {
  const frames = useMemo(
    () => roughFrames(circlePoints(cx, cy, r), hashString(seedKey), { amp }),
    [cx, cy, r, seedKey, amp],
  );
  return <Frames frames={frames} stroke={stroke} fill={fill} strokeWidth={strokeWidth} opacity={opacity} />;
}

/** An open hand-drawn line through the given points. */
export function RoughLine({
  points,
  seedKey,
  stroke = "var(--ink)",
  strokeWidth = 2,
  amp = 1.4,
  opacity = 1,
}: Common & { points: Pt[] }) {
  const frames = useMemo(
    () => roughFrames(points, hashString(seedKey), { amp, closed: false, passes: 1 }),
    [points, seedKey, amp],
  );
  return <Frames frames={frames} stroke={stroke} fill="none" strokeWidth={strokeWidth} opacity={opacity} />;
}

/**
 * A boiling border that fills its parent box.
 *
 * The box measures itself rather than drawing into a fixed viewBox and
 * stretching, because a stretched viewBox stretches the wobble with it: on a
 * wide panel the hand-drawn waver turns into long horizontal waves and the
 * corner radius goes oval. Measuring costs one ResizeObserver per card and
 * keeps the line looking like the same pen everywhere on the page.
 */
export function RoughBorder({
  seedKey,
  stroke = "var(--ink)",
  fill = "none",
  strokeWidth = 2,
  radius = 16,
  className = "",
  opacity = 1,
  amp = 1.8,
}: Common & { radius?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      // Snapped to 4 px so a drag-resize does not regenerate the path on
      // every single frame.
      const w = Math.max(16, Math.round(r.width / 4) * 4);
      const h = Math.max(16, Math.round(r.height / 4) * 4);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox={size ? `0 0 ${size.w} ${size.h}` : "0 0 100 100"}
      preserveAspectRatio="none"
      aria-hidden
    >
      {size && (
        <RoughRect
          w={size.w}
          h={size.h}
          r={radius}
          seedKey={`${seedKey}:${size.w}x${size.h}`}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          amp={amp}
          opacity={opacity}
        />
      )}
    </svg>
  );
}

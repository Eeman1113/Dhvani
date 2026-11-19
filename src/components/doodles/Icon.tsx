"use client";

import { useContext, useMemo } from "react";
import { ICON_PATHS } from "./icons";
import { LiteContext } from "./Anim";
import { useMotion } from "@/lib/useMotion";
import { hashString, seeded } from "@/lib/rough";

/**
 * A drawn icon.
 *
 * The outline is traced from artwork rather than written by hand, which is
 * the only reason these look drawn rather than constructed. What is still
 * done here is the boil: the same outline is redrawn twice more with the pen
 * wandering slightly, and the three are cycled at about eight frames a
 * second, exactly as the borders and the faders are.
 *
 * The wobble is derived in the browser instead of shipped, because three
 * copies of every path would triple the bundle for something a seeded
 * random walk reproduces exactly. It runs once per icon and is memoised.
 */

/** Offsets every coordinate in a path by a slow seeded walk. */
function wobble(d: string, seed: number, amp: number): string {
  const rnd = seeded(seed);
  let ox = 0;
  let oy = 0;
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const v = parseFloat(n);
    let out: number;
    if (i % 2 === 0) {
      // A pen wanders, it does not vibrate, so the offset is a damped walk
      // rather than independent noise per point.
      ox = ox * 0.6 + (rnd() * 2 - 1) * amp * 0.9;
      out = v + ox;
    } else {
      oy = oy * 0.6 + (rnd() * 2 - 1) * amp * 0.9;
      out = v + oy;
    }
    i++;
    return out.toFixed(1);
  });
}

const cache = new Map<string, [string, string, string]>();

function framesFor(name: string, d: string): [string, string, string] {
  const hit = cache.get(name);
  if (hit) return hit;
  const seed = hashString(name);
  const frames: [string, string, string] = [
    d,
    wobble(d, seed + 104729, 0.4),
    wobble(d, seed + 209459, 0.4),
  ];
  cache.set(name, frames);
  return frames;
}

/**
 * How each icon answers the mix.
 *
 * Anything not listed gets the default. These are the ones where a particular
 * band is obviously right: a fire flickers with the crackle up in the air
 * band, thunder moves with the bass, a bell jumps on the strike.
 */
const MOTION: Record<string, { band?: "bass" | "mid" | "air"; punch?: number; scale?: number }> = {
  fire: { band: "air", punch: 1.3, scale: 0.1 },
  thunder: { band: "bass", punch: 1.8, scale: 0.12 },
  downpour: { band: "air", scale: 0.07 },
  rain: { band: "air" },
  rainleaf: { band: "air" },
  snow: { band: "air", scale: 0.07 },
  wave: { band: "bass", scale: 0.08 },
  waterfall: { band: "bass", punch: 1.2 },
  rapids: { band: "air" },
  underwater: { band: "bass" },
  drip: { punch: 1.8, scale: 0.09 },
  bell: { band: "bass", punch: 2, scale: 0.1 },
  gong: { band: "bass", punch: 2.2, scale: 0.11 },
  bowl: { punch: 1.6, scale: 0.08 },
  bamboo: { band: "bass", punch: 2 },
  cricket: { band: "air", punch: 1.8 },
  cicada: { band: "air", punch: 1.6 },
  frog: { band: "bass", punch: 2 },
  heart: { band: "bass", punch: 2.4, scale: 0.13 },
  train: { band: "bass", punch: 1.4 },
  traffic: { band: "bass" },
  keyboard: { band: "air", punch: 1.5 },
  keyboard2: { band: "air", punch: 1.5 },
  keyboard3: { band: "air", punch: 1.9 },
  keyboard4: { band: "bass", punch: 1.7 },
  typewriter: { band: "mid", punch: 1.8 },
  white: { band: "air" },
  blue: { band: "air" },
  brown: { band: "bass" },
};

export function Icon({ name, active }: { name: string; active: boolean }) {
  const lite = useContext(LiteContext);
  const d = ICON_PATHS[name];
  const m = MOTION[name] ?? {};

  const ref = useMotion<SVGGElement>({
    active,
    band: m.band ?? "rms",
    lift: 3,
    scale: m.scale ?? 0.06,
    tilt: 1.4,
    punch: m.punch ?? 0.8,
  });

  const frames = useMemo(() => (d ? framesFor(name, d) : null), [name, d]);
  if (!frames) return null;

  // Lite holds one hand still rather than cycling three.
  const shown = lite ? frames.slice(0, 1) : frames;

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible" aria-hidden>
      <g ref={ref}>
        {shown.map((path, i) => (
          <g key={i} className={`boil-${i}`}>
            {/*
              evenodd, or every counter fills solid: potrace emits the holes
              as subpaths of the same path and relies on the fill rule to
              knock them out.
            */}
            <path d={path} fill="currentColor" fillRule="evenodd" />
          </g>
        ))}
      </g>
    </svg>
  );
}

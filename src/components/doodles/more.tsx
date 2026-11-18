"use client";

import { useMemo } from "react";
import { RoughCircle, RoughLine } from "@/components/Rough";
import { useMotion } from "@/lib/useMotion";
import { hashString, seeded, type Pt } from "@/lib/rough";

/**
 * The rest of the doodles, same 64 x 64 box and same rules as the first set.
 *
 * Each one leans on whichever part of the spectrum its sound actually lives
 * in, so a cafe sways with the voices, a gong swells with the low end, and
 * the cicada buzzes with the air.
 */

const S = 64;
const ink = "var(--ink)";
const acc = "var(--accent)";
const acc2 = "var(--accent-2)";
const paper2 = "var(--paper-2)";
const paper3 = "var(--paper-3)";

type Props = { active: boolean; id: string };
type Band = "bass" | "mid" | "air" | "rms";

function Box({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-full w-full overflow-visible" aria-hidden>
      {children}
    </svg>
  );
}

/** Wraps a static drawing in the standard reactive motion. */
function doodle(
  draw: (p: Props) => React.ReactNode,
  opts: { band?: Band; lift?: number; scale?: number; tilt?: number; punch?: number } = {},
): React.FC<Props> {
  const C: React.FC<Props> = (p) => {
    const ref = useMotion<SVGGElement>({
      active: p.active,
      band: opts.band ?? "mid",
      lift: opts.lift ?? 3,
      scale: opts.scale ?? 0.06,
      tilt: opts.tilt ?? 1.2,
      punch: opts.punch ?? 0.8,
    });
    return (
      <Box>
        <g ref={ref}>{draw(p)}</g>
      </Box>
    );
  };
  return C;
}

const css = (o: Record<string, string | number>) => o as React.CSSProperties;

/* ------------------------------------------------------------------ */
/* rain and weather                                                    */
/* ------------------------------------------------------------------ */

const Tent = doodle(
  () => (
    <>
      <path d="M 32 14 L 54 50 L 10 50 Z" fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 32 16 L 32 50" stroke={ink} strokeWidth={1.6} opacity={0.5} />
      <path d="M 32 26 L 24 50 L 40 50 Z" fill={paper2} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
      {[16, 26, 38, 48].map((x, i) => (
        <path key={x} d={`M ${x} 6 l -1.5 7`} stroke={acc} strokeWidth={2} strokeLinecap="round" className="anim-fall"
          style={css({ "--d": `${0.9 + i * 0.2}s`, animationDelay: `${-i * 0.4}s` })} />
      ))}
    </>
  ),
  { band: "mid", punch: 1.2 },
);

const RainLeaf = doodle(
  () => (
    <>
      <path d="M 14 30 C 24 18, 42 18, 50 28 C 44 40, 24 42, 14 30 Z" fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 14 30 C 26 30, 40 29, 50 28" stroke={ink} strokeWidth={1.4} fill="none" opacity={0.55} />
      <path d="M 22 25 L 26 30 M 32 23 L 34 30 M 42 24 L 42 29" stroke={ink} strokeWidth={1.1} opacity={0.4} />
      {[20, 32, 44].map((x, i) => (
        <path key={x} d={`M ${x} 42 l -1 8`} stroke={acc} strokeWidth={2} strokeLinecap="round" className="anim-fall"
          style={css({ "--d": `${1 + i * 0.25}s`, animationDelay: `${-i * 0.5}s` })} />
      ))}
    </>
  ),
  { band: "air" },
);

const Snow = doodle(
  () => {
    const flakes = useMemo(() => {
      const r = seeded(hashString("snow"));
      return Array.from({ length: 9 }, () => ({ x: 10 + r() * 44, y: 10 + r() * 36, s: 1.6 + r() * 2.4, d: r() * 3 }));
    }, []);
    return (
      <>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M 6 ${20 + i * 11} C 22 ${15 + i * 11}, 40 ${25 + i * 11}, 58 ${18 + i * 11}`}
            fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.5}>
            <animate attributeName="stroke-dasharray" values="0 80;50 80;80 0" dur={`${2.4 + i * 0.6}s`} repeatCount="indefinite" />
          </path>
        ))}
        {flakes.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r={f.s} fill={acc} opacity={0.8}>
            <animate attributeName="cy" values={`${f.y};${f.y + 16}`} dur={`${1.8 + f.d}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.85;0" dur={`${1.8 + f.d}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </>
    );
  },
  { band: "air", tilt: 3 },
);

const Leaves = doodle(
  () => (
    <>
      {[
        { x: 14, y: 20, r: -20, d: "2.6s" },
        { x: 38, y: 14, r: 15, d: "3.2s" },
        { x: 24, y: 38, r: 40, d: "2.1s" },
        { x: 44, y: 36, r: -35, d: "3.6s" },
      ].map((l, i) => (
        <g key={i} className="anim-sway" style={css({ "--d": l.d, transformOrigin: `${l.x}px ${l.y}px` })}>
          <path d={`M 0 0 C 7 -6, 16 -5, 19 1 C 14 8, 4 8, 0 0 Z`}
            transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}
            fill={i % 2 ? acc : paper3} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
        </g>
      ))}
      <path d="M 8 52 C 22 46, 42 56, 58 48" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.4} />
    </>
  ),
  { band: "air", tilt: 4 },
);

/* ------------------------------------------------------------------ */
/* water                                                               */
/* ------------------------------------------------------------------ */

const Rapids = doodle(
  () => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M 4 ${18 + i * 9} C 14 ${12 + i * 9}, 20 ${24 + i * 9}, 30 ${18 + i * 9} C 40 ${12 + i * 9}, 48 ${24 + i * 9}, 60 ${18 + i * 9}`}
          fill="none" stroke={i % 2 ? acc : ink} strokeWidth={2.4} strokeLinecap="round">
          <animateTransform attributeName="transform" type="translate" values="-8 0;8 0;-8 0" dur={`${1.4 + i * 0.4}s`} repeatCount="indefinite" />
        </path>
      ))}
      <RoughCircle cx={18} cy={40} r={5} seedKey="rap1" stroke={ink} fill={paper3} strokeWidth={2} />
      <RoughCircle cx={44} cy={26} r={4} seedKey="rap2" stroke={ink} fill={paper3} strokeWidth={2} />
    </>
  ),
  { band: "air", scale: 0.05 },
);

const Waterfall = doodle(
  () => (
    <>
      <path d="M 16 8 L 48 8 L 46 40 L 18 40 Z" fill={acc} opacity={0.3} stroke="none" />
      {[20, 26, 32, 38, 44].map((x, i) => (
        <path key={x} d={`M ${x} 8 C ${x + 2} 20, ${x - 2} 30, ${x} 40`} fill="none" stroke={i === 2 ? acc : ink}
          strokeWidth={2} strokeLinecap="round" opacity={0.8}>
          <animate attributeName="stroke-dasharray" values="0 50;30 50;50 0" dur={`${0.8 + i * 0.15}s`} repeatCount="indefinite" />
        </path>
      ))}
      <RoughLine points={[[10, 8], [54, 8]] as Pt[]} seedKey="wfedge" stroke={ink} strokeWidth={2.6} />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={32} cy={46} rx={10 + i * 5} ry={3 + i} fill="none" stroke={acc} strokeWidth={1.4}
          className="anim-ripple" style={css({ "--d": `${1.6 + i * 0.6}s`, transformOrigin: "32px 46px" })} />
      ))}
    </>
  ),
  { band: "bass", punch: 1.2 },
);

const Underwater = doodle(
  () => {
    const bubbles = useMemo(() => {
      const r = seeded(hashString("bub"));
      return Array.from({ length: 7 }, () => ({ x: 12 + r() * 40, s: 1.8 + r() * 3.2, d: 2 + r() * 2.5, del: -r() * 3 }));
    }, []);
    return (
      <>
        <path d="M 4 12 C 20 8, 44 16, 60 10" fill="none" stroke={acc} strokeWidth={2.2} strokeLinecap="round" opacity={0.7}>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0" dur="3s" repeatCount="indefinite" />
        </path>
        {bubbles.map((b, i) => (
          <circle key={i} cx={b.x} cy={50} r={b.s} fill="none" stroke={i % 2 ? acc : ink} strokeWidth={1.6}>
            <animate attributeName="cy" values="52;14" dur={`${b.d}s`} begin={`${b.del}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0" dur={`${b.d}s`} begin={`${b.del}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <path d="M 8 56 C 22 52, 40 58, 58 54" fill="none" stroke={ink} strokeWidth={1.6} opacity={0.35} />
      </>
    );
  },
  { band: "bass", scale: 0.04 },
);

const Drip = doodle(
  () => (
    <>
      <path d="M 10 14 C 22 10, 30 18, 42 13 C 50 10, 56 16, 58 14" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 20 15 C 19 20, 21 22, 20 26" stroke={ink} strokeWidth={1.4} fill="none" opacity={0.45} />
      <path d="M 44 14 C 45 19, 43 21, 44 24" stroke={ink} strokeWidth={1.4} fill="none" opacity={0.45} />
      <path d="M 32 18 C 32 24, 29 27, 32 31 C 35 27, 32 24, 32 18 Z" fill={acc} stroke={ink} strokeWidth={1.6}>
        <animate attributeName="opacity" values="1;1;0" dur="2.6s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" values="0 0;0 20;0 20" dur="2.6s" repeatCount="indefinite" />
      </path>
      <ellipse cx={32} cy={52} rx={13} ry={3.4} fill="none" stroke={ink} strokeWidth={2} />
      {[0, 1].map((i) => (
        <ellipse key={i} cx={32} cy={52} rx={6 + i * 6} ry={2 + i} fill="none" stroke={acc} strokeWidth={1.3}
          className="anim-ripple" style={css({ "--d": `${2.6}s`, animationDelay: `${i * 0.3}s`, transformOrigin: "32px 52px" })} />
      ))}
    </>
  ),
  { band: "mid", punch: 1.8, scale: 0.08 },
);

/* ------------------------------------------------------------------ */
/* night                                                               */
/* ------------------------------------------------------------------ */

const Cicada = doodle(
  () => (
    <>
      <ellipse cx={32} cy={34} rx={9} ry={14} fill={paper3} stroke={ink} strokeWidth={2.2} />
      <path d="M 24 26 C 10 24, 6 38, 22 42 Z" fill={acc} opacity={0.55} stroke={ink} strokeWidth={1.6} strokeLinejoin="round"
        className="anim-sway" style={css({ "--d": "0.5s", transformOrigin: "24px 30px" })} />
      <path d="M 40 26 C 54 24, 58 38, 42 42 Z" fill={acc} opacity={0.55} stroke={ink} strokeWidth={1.6} strokeLinejoin="round"
        className="anim-sway" style={css({ "--d": "0.55s", transformOrigin: "40px 30px" })} />
      <circle cx={32} cy={21} r={5.5} fill={paper2} stroke={ink} strokeWidth={2} />
      <circle cx={29.5} cy={20} r={1.4} fill={ink} />
      <circle cx={34.5} cy={20} r={1.4} fill={ink} />
      <path d="M 27 38 L 32 38 M 27 43 L 32 43" stroke={ink} strokeWidth={1.2} opacity={0.5} />
    </>
  ),
  { band: "air", punch: 1.6, scale: 0.09 },
);

const Frog = doodle(
  () => (
    <>
      <ellipse cx={32} cy={38} rx={16} ry={11} fill={acc} stroke={ink} strokeWidth={2.2} opacity={0.85} />
      <circle cx={24} cy={26} r={5.5} fill={paper2} stroke={ink} strokeWidth={2} />
      <circle cx={40} cy={26} r={5.5} fill={paper2} stroke={ink} strokeWidth={2} />
      <circle cx={24} cy={27} r={2} fill={ink} />
      <circle cx={40} cy={27} r={2} fill={ink} />
      <path d="M 24 40 C 28 44, 36 44, 40 40" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M 16 44 L 10 50 M 48 44 L 54 50" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      {/* the throat sac, inflating */}
      <ellipse cx={32} cy={47} rx={7} ry={4} fill={paper3} stroke={ink} strokeWidth={1.8}>
        <animate attributeName="ry" values="2;6;2" dur="1.8s" repeatCount="indefinite" />
      </ellipse>
    </>
  ),
  { band: "bass", punch: 2, scale: 0.08 },
);

const Owl = doodle(
  () => (
    <>
      <path d="M 32 12 C 44 12, 50 24, 50 34 C 50 46, 42 52, 32 52 C 22 52, 14 46, 14 34 C 14 24, 20 12, 32 12 Z"
        fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 18 16 L 22 24 M 46 16 L 42 24" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={25} cy={28} r={6.5} fill={paper2} stroke={ink} strokeWidth={2} />
      <circle cx={39} cy={28} r={6.5} fill={paper2} stroke={ink} strokeWidth={2} />
      <circle cx={25} cy={28} r={2.6} fill={ink}>
        <animate attributeName="r" values="2.6;2.6;0.4;2.6" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={39} cy={28} r={2.6} fill={ink}>
        <animate attributeName="r" values="2.6;2.6;0.4;2.6" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <path d="M 32 32 L 29 37 L 35 37 Z" fill={acc} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M 24 44 C 28 47, 36 47, 40 44" fill="none" stroke={ink} strokeWidth={1.4} opacity={0.45} />
    </>
  ),
  { band: "mid", punch: 1.4, scale: 0.07 },
);

const Bird = doodle(
  () => (
    <>
      {/* a branch, and three birds who are not in time with each other */}
      <path d="M 4 44 C 18 40, 34 46, 60 38" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M 22 42 C 24 36, 28 34, 30 30 M 44 41 C 46 35, 50 34, 52 29" fill="none" stroke={ink} strokeWidth={1.4} opacity={0.45} />
      {[
        { x: 16, y: 32, s: 1, d: "2.4s", f: acc },
        { x: 34, y: 28, s: 0.82, d: "3.1s", f: paper3 },
        { x: 48, y: 30, s: 0.9, d: "2.7s", f: paper2 },
      ].map((b, i) => (
        <g key={i} className="anim-bobble" style={css({ "--d": b.d, animationDelay: `${-i * 0.6}s` })}
          transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
          <path d="M 0 0 C 6 -8, 16 -6, 16 2 C 16 8, 9 11, 3 9 C -1 7, -3 3, 0 0 Z"
            fill={b.f} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <circle cx={11} cy={-1} r={1.3} fill={ink} />
          <path d="M 16 1 L 22 2 L 16 4 Z" fill={ink} stroke="none" />
          <path d="M 4 4 C 8 1, 12 2, 13 5 C 10 7, 6 7, 4 4 Z" fill="none" stroke={ink} strokeWidth={1.2} opacity={0.5} />
          {/* the beak opens when it sings */}
          <path d="M 3 10 L 1 14" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      {[0, 1].map((i) => (
        <path key={i} d={`M ${54 + i * 4} 18 C ${57 + i * 4} 22, ${57 + i * 4} 28, ${54 + i * 4} 32`}
          fill="none" stroke={acc} strokeWidth={1.6} strokeLinecap="round" opacity={0.65 - i * 0.25}>
          <animate attributeName="opacity" values={`0;${0.65 - i * 0.25};0`} dur="2.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  { band: "air", punch: 1.6, scale: 0.07, tilt: 2 },
);

/* ------------------------------------------------------------------ */
/* people                                                              */
/* ------------------------------------------------------------------ */

/** A speech bubble that pulses with the voices. */
function Bubble({ x, y, w, h, fill, delay }: { x: number; y: number; w: number; h: number; fill: string; delay: number }) {
  return (
    <g className="anim-bobble" style={css({ "--d": `${2 + delay}s`, animationDelay: `${-delay}s` })}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2.2} fill={fill} stroke={ink} strokeWidth={2} />
      <path d={`M ${x + w * 0.3} ${y + h} l -2 5 l 7 -5 Z`} fill={fill} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

const Cafe = doodle(
  () => (
    <>
      <Bubble x={8} y={10} w={24} h={13} fill={paper2} delay={0.3} />
      <Bubble x={34} y={22} w={22} h={12} fill={acc} delay={0.9} />
      <path d="M 16 40 L 18 54 C 18 56, 20 57, 22 57 L 32 57 C 34 57, 36 56, 36 54 L 38 40 Z"
        fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <ellipse cx={27} cy={40} rx={11} ry={3.4} fill={paper2} stroke={ink} strokeWidth={2} />
      <path d="M 38 43 C 46 43, 46 51, 38 51" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 24 36 C 26 31, 22 29, 24 25" fill="none" stroke={acc} strokeWidth={1.8} strokeLinecap="round" opacity={0.75}>
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
      </path>
    </>
  ),
  { band: "mid", scale: 0.05, tilt: 1.6 },
);

const Plate = doodle(
  () => (
    <>
      <RoughCircle cx={32} cy={36} r={17} seedKey="plate1" stroke={ink} fill={paper2} strokeWidth={2.2} />
      <RoughCircle cx={32} cy={36} r={11} seedKey="plate2" stroke={ink} strokeWidth={1.4} opacity={0.45} />
      <g className="anim-sway" style={css({ "--d": "3.4s", transformOrigin: "14px 18px" })}>
        <path d="M 14 14 L 14 40" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M 11 14 L 11 22 M 14 14 L 14 22 M 17 14 L 17 22" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <g className="anim-sway" style={css({ "--d": "3.9s", transformOrigin: "50px 18px" })}>
        <path d="M 50 14 L 50 40" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
        <ellipse cx={50} cy={19} rx={3.4} ry={6} fill={acc} stroke={ink} strokeWidth={1.6} />
      </g>
    </>
  ),
  { band: "air", punch: 1.4 },
);

const Glass = doodle(
  () => (
    <>
      <path d="M 20 14 L 44 14 L 40 52 L 24 52 Z" fill={paper2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 22 28 L 42 28 L 40 52 L 24 52 Z" fill={acc} opacity={0.5} stroke="none">
        <animate attributeName="opacity" values="0.4;0.6;0.4" dur="4s" repeatCount="indefinite" />
      </path>
      <ellipse cx={32} cy={28} rx={10} ry={2.6} fill={paper3} stroke={ink} strokeWidth={1.6} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={27 + i * 5} cy={44} r={1.6} fill={paper2} stroke={ink} strokeWidth={1}>
          <animate attributeName="cy" values="48;30" dur={`${1.6 + i * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur={`${1.6 + i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </>
  ),
  { band: "mid", punch: 1.2 },
);

const Market = doodle(
  () => (
    <>
      <path d="M 6 26 L 32 12 L 58 26 Z" fill={acc} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" opacity={0.8} />
      <path d="M 6 26 C 10 31, 14 31, 18 26 C 22 31, 26 31, 30 26 C 34 31, 38 31, 42 26 C 46 31, 50 31, 54 26 C 56 29, 57 28, 58 26"
        fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M 12 30 L 12 52 M 52 30 L 52 52" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <RoughLine points={[[14, 44], [50, 44]] as Pt[]} seedKey="stall" stroke={ink} strokeWidth={2.2} />
      {[20, 28, 36, 44].map((x, i) => (
        <circle key={x} cx={x} cy={40} r={3.4} fill={i % 2 ? paper3 : acc} stroke={ink} strokeWidth={1.6}
          className="anim-bobble" style={css({ "--d": `${2 + i * 0.4}s` })} />
      ))}
    </>
  ),
  { band: "mid", tilt: 1.8 },
);

const Desk = doodle(
  () => (
    <>
      <path d="M 10 30 L 54 30 L 54 36 L 10 36 Z" fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 14 36 L 14 52 M 50 36 L 50 52" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 22 12 L 42 12 L 42 26 L 22 26 Z" fill={paper2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 32 26 L 32 30" stroke={ink} strokeWidth={2} />
      <path d="M 25 17 L 39 17 M 25 21 L 35 21" stroke={acc} strokeWidth={1.6} strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.8s" repeatCount="indefinite" />
      </path>
      <Bubble x={40} y={6} w={18} h={10} fill={acc} delay={0.6} />
    </>
  ),
  { band: "mid", scale: 0.04 },
);

const Door = doodle(
  () => (
    <>
      <path d="M 16 10 L 46 10 L 46 54 L 16 54 Z" fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 20 15 L 42 15 L 42 30 L 20 30 Z M 20 34 L 42 34 L 42 49 L 20 49 Z"
        fill="none" stroke={ink} strokeWidth={1.4} opacity={0.45} />
      <circle cx={41} cy={33} r={2.2} fill={ink} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${50 + i * 4} 24 C ${53 + i * 4} 28, ${53 + i * 4} 36, ${50 + i * 4} 40`}
          fill="none" stroke={acc} strokeWidth={1.8} strokeLinecap="round" opacity={0.8 - i * 0.22}>
          <animate attributeName="opacity" values={`0;${0.8 - i * 0.22};0`} dur="2.6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  { band: "mid", scale: 0.03, tilt: 0.8 },
);

const Book = doodle(
  () => (
    <>
      <path d="M 32 20 C 26 15, 16 14, 10 16 L 10 48 C 16 46, 26 47, 32 52 C 38 47, 48 46, 54 48 L 54 16 C 48 14, 38 15, 32 20 Z"
        fill={paper2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 32 20 L 32 52" stroke={ink} strokeWidth={2} />
      <path d="M 15 23 L 27 24 M 15 29 L 27 30 M 15 35 L 25 36 M 37 24 L 49 23 M 37 30 L 49 29 M 39 36 L 49 35"
        stroke={ink} strokeWidth={1.2} opacity={0.4} strokeLinecap="round" />
      <path d="M 32 20 C 36 16, 42 14, 46 14" fill="none" stroke={acc} strokeWidth={2} strokeLinecap="round">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="5s" repeatCount="indefinite" />
      </path>
    </>
  ),
  { band: "mid", scale: 0.03, tilt: 0.6 },
);

/* ------------------------------------------------------------------ */
/* zen                                                                 */
/* ------------------------------------------------------------------ */

const Bell = doodle(
  () => (
    <>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${46 + i * 4} 24 C ${50 + i * 4} 30, ${50 + i * 4} 38, ${46 + i * 4} 44`}
          fill="none" stroke={acc} strokeWidth={1.6} strokeLinecap="round" opacity={0.7 - i * 0.2}
          className="anim-ripple" style={css({ "--d": `${3 + i}s`, transformOrigin: "40px 34px" })} />
      ))}
      <path d="M 32 10 C 20 10, 16 22, 16 34 C 16 42, 18 46, 18 46 L 46 46 C 46 46, 48 42, 48 34 C 48 22, 44 10, 32 10 Z"
        fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 16 40 L 48 40" stroke={ink} strokeWidth={1.6} opacity={0.4} />
      <ellipse cx={32} cy={46} rx={15} ry={3.2} fill={paper2} stroke={ink} strokeWidth={2.2} />
      <path d="M 28 10 C 28 6, 36 6, 36 10" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={32} cy={30} r={2.2} fill={ink} opacity={0.5} />
    </>
  ),
  { band: "bass", punch: 1.8, scale: 0.09 },
);

const Gong = doodle(
  () => (
    <>
      <RoughLine points={[[10, 12], [54, 12]] as Pt[]} seedKey="gongbar" stroke={ink} strokeWidth={2.4} />
      <path d="M 20 12 L 24 20 M 44 12 L 40 20" stroke={ink} strokeWidth={1.4} />
      <RoughCircle cx={32} cy={36} r={18} seedKey="gongdisc" stroke={ink} fill={acc} strokeWidth={2.6} opacity={0.9} />
      <RoughCircle cx={32} cy={36} r={11} seedKey="gongring" stroke={ink} strokeWidth={1.6} opacity={0.45} />
      <RoughCircle cx={32} cy={36} r={5} seedKey="gongboss" stroke={ink} fill={paper3} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={32} cy={36} r={20 + i * 5} fill="none" stroke={acc} strokeWidth={1.3}
          className="anim-ripple" style={css({ "--d": `${3.2 + i * 0.9}s`, transformOrigin: "32px 36px" })} />
      ))}
    </>
  ),
  { band: "bass", punch: 2.2, scale: 0.1 },
);

const Flute = doodle(
  () => (
    <>
      <g transform="rotate(-28 32 32)">
        <rect x={12} y={28} width={40} height={9} rx={4.5} fill={paper3} stroke={ink} strokeWidth={2.2} />
        {[22, 29, 36, 43].map((x) => (
          <circle key={x} cx={x} cy={32.5} r={1.9} fill={ink} />
        ))}
        <path d="M 12 30 C 9 32, 9 34, 12 36" fill="none" stroke={ink} strokeWidth={2} />
      </g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${42 + i * 5} 18 C ${46 + i * 5} 14, ${46 + i * 5} 10, ${42 + i * 5} 6`}
          fill="none" stroke={acc} strokeWidth={1.8} strokeLinecap="round" opacity={0.7 - i * 0.2}>
          <animate attributeName="opacity" values={`0;${0.75 - i * 0.2};0`} dur="4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  { band: "mid", scale: 0.05, tilt: 2 },
);

const Rainstick = doodle(
  () => {
    const grains = useMemo(() => {
      const r = seeded(hashString("grain"));
      return Array.from({ length: 10 }, () => ({ x: 26 + r() * 12, d: 1 + r() * 1.8, del: -r() * 2 }));
    }, []);
    return (
      <>
        <g transform="rotate(12 32 32)">
          <rect x={24} y={8} width={16} height={48} rx={8} fill={paper3} stroke={ink} strokeWidth={2.4} />
          {[16, 24, 32, 40, 48].map((y) => (
            <path key={y} d={`M 24 ${y} L 40 ${y - 4}`} stroke={ink} strokeWidth={1.2} opacity={0.35} />
          ))}
          {grains.map((g, i) => (
            <circle key={i} cx={g.x} cy={14} r={1.5} fill={acc}>
              <animate attributeName="cy" values="12;52" dur={`${g.d}s`} begin={`${g.del}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur={`${g.d}s`} begin={`${g.del}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      </>
    );
  },
  { band: "air", tilt: 3 },
);

function DroneMark({ rings, band }: { rings: number; band: Band }) {
  const ref = useMotion<SVGGElement>({ band, lift: 2, scale: 0.09, tilt: 0.5, punch: 0.6 });
  return (
    <Box>
      <g ref={ref}>
        {Array.from({ length: rings }, (_, i) => (
          <circle key={i} cx={32} cy={32} r={6 + i * 5} fill="none" stroke={i % 2 ? acc : ink} strokeWidth={2 - i * 0.18}
            opacity={0.85 - i * 0.12}>
            <animate attributeName="r" values={`${6 + i * 5};${7.5 + i * 5};${6 + i * 5}`} dur={`${3 + i * 0.8}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <circle cx={32} cy={32} r={3} fill={acc} />
      </g>
    </Box>
  );
}

const Drone: React.FC<Props> = () => <DroneMark rings={5} band="bass" />;
const Drone2: React.FC<Props> = () => <DroneMark rings={4} band="mid" />;

/* ------------------------------------------------------------------ */
/* room                                                                */
/* ------------------------------------------------------------------ */

/** The keyboards differ by key shape and travel, the way the real ones do. */
function KeyBoard({ keyR, tall, accentRow, seed }: { keyR: number; tall: number; accentRow: number; seed: string }) {
  const keys = useMemo(() => {
    const out: { x: number; y: number; d: number; row: number }[] = [];
    const r = seeded(hashString(seed));
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 6; col++)
        out.push({ x: 15 + col * 6.2 + row * 1.6, y: 28 + row * (tall + 2), d: r() * 2.2, row });
    return out;
  }, [seed, tall]);
  return (
    <>
      <path d="M 10 24 L 54 24 L 58 52 L 6 52 Z" fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      {keys.map((k, i) => (
        <rect key={i} x={k.x} y={k.y} width={4.6} height={tall} rx={keyR}
          fill={k.row === accentRow ? acc : ink} opacity={k.row === accentRow ? 0.6 : 0.32}>
          <animate attributeName="opacity" values="0.3;0.3;0.95;0.3" dur="2.4s" begin={`${k.d}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </>
  );
}

const Keyboard2 = doodle(() => <KeyBoard keyR={1.2} tall={5} accentRow={1} seed="kb2" />, { band: "air", punch: 1.4 });
const Keyboard3 = doodle(() => <KeyBoard keyR={0.4} tall={4.4} accentRow={0} seed="kb3" />, { band: "air", punch: 1.9, scale: 0.08 });
const Keyboard4 = doodle(() => <KeyBoard keyR={2.4} tall={6} accentRow={2} seed="kb4" />, { band: "bass", punch: 1.6, scale: 0.08 });

const Typewriter = doodle(
  () => (
    <>
      <path d="M 10 32 L 54 32 L 56 52 L 8 52 Z" fill={paper3} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 18 18 L 46 18 L 46 32 L 18 32 Z" fill={paper2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 22 10 L 44 10 L 44 18 L 22 18 Z" fill="var(--paper)" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M 25 13 L 41 13" stroke={acc} strokeWidth={1.4} strokeLinecap="round">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite" />
      </path>
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <circle key={`${row}-${col}`} cx={16 + col * 6.4 + row * 3} cy={38 + row * 7} r={2.2} fill={ink} opacity={0.35}>
            <animate attributeName="opacity" values="0.3;0.3;0.95;0.3" dur="2.6s" begin={`${(row * 6 + col) * 0.17}s`} repeatCount="indefinite" />
          </circle>
        )),
      )}
      <circle cx={52} cy={24} r={3.2} fill={acc} stroke={ink} strokeWidth={1.6} className="anim-bobble" />
    </>
  ),
  { band: "mid", punch: 1.8, scale: 0.07 },
);

const Pen = doodle(
  () => (
    <>
      <path d="M 8 50 L 56 50" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 12 42 C 20 38, 24 44, 32 40 C 40 36, 44 42, 52 38" fill="none" stroke={acc} strokeWidth={2} strokeLinecap="round">
        <animate attributeName="stroke-dasharray" values="0 70;45 70;70 0" dur="4s" repeatCount="indefinite" />
      </path>
      <g transform="rotate(38 40 24)" className="anim-bobble" style={css({ "--d": "1.6s" })}>
        <rect x={36} y={6} width={8} height={26} rx={2} fill={paper3} stroke={ink} strokeWidth={2} />
        <path d="M 36 32 L 40 40 L 44 32 Z" fill={ink} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M 36 12 L 44 12" stroke={ink} strokeWidth={1.4} opacity={0.5} />
      </g>
    </>
  ),
  { band: "air", punch: 1.5 },
);

const Clock = doodle(
  () => (
    <>
      <RoughCircle cx={32} cy={32} r={21} seedKey="clockface" stroke={ink} fill={paper2} strokeWidth={2.6} />
      {[0, 3, 6, 9].map((h) => {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <line key={h} x1={32 + Math.cos(a) * 16} y1={32 + Math.sin(a) * 16}
            x2={32 + Math.cos(a) * 19} y2={32 + Math.sin(a) * 19} stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
        );
      })}
      <line x1={32} y1={32} x2={32} y2={21} stroke={ink} strokeWidth={2.4} strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" values="0 32 32;360 32 32" dur="60s" repeatCount="indefinite" />
      </line>
      <line x1={32} y1={32} x2={41} y2={38} stroke={ink} strokeWidth={2.8} strokeLinecap="round" />
      <circle cx={32} cy={32} r={2.4} fill={acc} />
      {/* the pendulum, swinging a touch unevenly */}
      <g className="anim-sway" style={css({ "--d": "2s", transformOrigin: "32px 32px" })}>
        <line x1={32} y1={32} x2={32} y2={56} stroke={ink} strokeWidth={1.6} />
        <circle cx={32} cy={57} r={4} fill={acc} stroke={ink} strokeWidth={1.6} />
      </g>
    </>
  ),
  { band: "air", punch: 1.6, scale: 0.05 },
);

const Fridge = doodle(
  () => (
    <>
      <path d="M 18 8 L 46 8 L 46 56 L 18 56 Z" fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 18 24 L 46 24" stroke={ink} strokeWidth={2} />
      <path d="M 41 15 L 41 20 M 41 28 L 41 36" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={23} y={12} width={8} height={6} rx={1.4} fill={acc} opacity={0.7} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${50 + i * 4} 30 C ${53 + i * 4} 34, ${53 + i * 4} 40, ${50 + i * 4} 44`}
          fill="none" stroke={acc} strokeWidth={1.6} strokeLinecap="round" opacity={0.6 - i * 0.18}>
          <animate attributeName="opacity" values={`0;${0.6 - i * 0.18};0`} dur="3.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  { band: "bass", scale: 0.03, tilt: 0.5 },
);

const Washing = doodle(
  () => (
    <>
      <path d="M 12 10 L 52 10 L 52 56 L 12 56 Z" fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 12 20 L 52 20" stroke={ink} strokeWidth={1.8} opacity={0.6} />
      <circle cx={18} cy={15} r={2} fill={acc} />
      <circle cx={25} cy={15} r={2} fill={ink} opacity={0.4} />
      <RoughCircle cx={32} cy={38} r={15} seedKey="drumring" stroke={ink} fill={paper2} strokeWidth={2.4} />
      <g className="anim-spin" style={css({ "--d": "4.5s", transformOrigin: "32px 38px" })}>
        <path d="M 32 26 C 40 30, 42 44, 34 50 C 26 48, 22 34, 32 26 Z" fill={acc} opacity={0.55} stroke={ink} strokeWidth={1.6} />
        <circle cx={27} cy={34} r={2.4} fill={paper2} stroke={ink} strokeWidth={1.2} />
        <circle cx={37} cy={43} r={2} fill={paper2} stroke={ink} strokeWidth={1.2} />
      </g>
    </>
  ),
  { band: "bass", punch: 1.1, scale: 0.05 },
);

const Kettle = doodle(
  () => (
    <>
      <path d="M 16 28 L 48 28 C 50 40, 46 50, 32 50 C 18 50, 14 40, 16 28 Z"
        fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 48 32 C 56 32, 58 24, 54 20" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 22 28 C 22 20, 42 20, 42 28" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={32} cy={28} rx={16} ry={3.4} fill={paper2} stroke={ink} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${50 + i * 2} 18 C ${54 + i * 2} 13, ${50 + i * 2} 9, ${53 + i * 2} 5`}
          fill="none" stroke={acc} strokeWidth={2} strokeLinecap="round" opacity={0.75 - i * 0.2}>
          <animate attributeName="opacity" values={`0;${0.75 - i * 0.2};0`} dur="2.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  { band: "air", punch: 1.3 },
);

const Heart = doodle(
  () => (
    <>
      <g style={{ transformOrigin: "32px 34px" }}>
        <path d="M 32 50 C 14 38, 10 26, 16 20 C 22 14, 30 18, 32 24 C 34 18, 42 14, 48 20 C 54 26, 50 38, 32 50 Z"
          fill={acc} stroke={ink} strokeWidth={2.4} strokeLinejoin="round">
          <animateTransform attributeName="transform" type="scale" values="1;1.1;0.98;1.04;1"
            dur="1s" repeatCount="indefinite" additive="sum" />
          <animateTransform attributeName="transform" type="translate" values="-3.2 -3.4;-3.2 -3.4"
            dur="1s" repeatCount="indefinite" additive="sum" />
        </path>
      </g>
      <path d="M 6 46 L 16 46 L 20 36 L 26 54 L 32 44 L 40 44" fill="none" stroke={ink}
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </>
  ),
  { band: "bass", punch: 2.4, scale: 0.12, lift: 2 },
);

/* ------------------------------------------------------------------ */
/* travel                                                              */
/* ------------------------------------------------------------------ */

const Train = doodle(
  () => (
    <>
      <path d="M 10 20 C 10 14, 14 12, 20 12 L 44 12 C 50 12, 54 14, 54 20 L 54 44 L 10 44 Z"
        fill={paper3} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 16 18 L 30 18 L 30 28 L 16 28 Z M 34 18 L 48 18 L 48 28 L 34 28 Z"
        fill={acc} opacity={0.55} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M 10 36 L 54 36" stroke={ink} strokeWidth={1.6} opacity={0.4} />
      <circle cx={21} cy={48} r={4.4} fill={paper2} stroke={ink} strokeWidth={2}
        className="anim-spin" style={css({ "--d": "1.1s", transformOrigin: "21px 48px" })} />
      <circle cx={43} cy={48} r={4.4} fill={paper2} stroke={ink} strokeWidth={2}
        className="anim-spin" style={css({ "--d": "1.1s", transformOrigin: "43px 48px" })} />
      <path d="M 4 54 L 60 54" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 8 58 L 14 58 M 22 58 L 28 58 M 36 58 L 42 58 M 50 58 L 56 58" stroke={ink} strokeWidth={1.6} opacity={0.5} />
    </>
  ),
  { band: "bass", punch: 1.4, scale: 0.05, tilt: 1.4 },
);

const Traffic = doodle(
  () => (
    <>
      <path d="M 4 44 L 60 44" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 8 52 L 18 52 M 26 52 L 36 52 M 44 52 L 54 52" stroke={ink} strokeWidth={2} opacity={0.4} strokeLinecap="round" />
      {[
        { y: 24, dur: "3.2s", fill: acc, dir: 1 },
        { y: 34, dur: "4.4s", fill: paper3, dir: -1 },
      ].map((c, i) => (
        <g key={i}>
          <path d="M 0 0 L 4 -7 L 16 -7 L 21 0 L 22 7 L -1 7 Z" fill={c.fill} stroke={ink} strokeWidth={1.8} strokeLinejoin="round"
            transform={`translate(20 ${c.y})`}>
            <animateTransform attributeName="transform" type="translate"
              values={c.dir > 0 ? `-26 ${c.y}; 66 ${c.y}` : `66 ${c.y}; -26 ${c.y}`} dur={c.dur} repeatCount="indefinite" />
          </path>
        </g>
      ))}
    </>
  ),
  { band: "bass", scale: 0.04 },
);

/* ------------------------------------------------------------------ */
/* noise colours                                                       */
/* ------------------------------------------------------------------ */

function Scribble({ density, colour, seed, active }: { density: number; colour: string; seed: string; active: boolean }) {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 2, scale: 0.05 });
  const d = useMemo(() => {
    const r = seeded(hashString(seed));
    const lines = Math.round(4 + density * 16);
    let path = "";
    for (let i = 0; i < lines; i++) {
      const y = 14 + (i / lines) * 36 + r() * 2;
      path += `M 12 ${y.toFixed(1)} `;
      for (let x = 16; x <= 52; x += 6) path += `L ${x} ${(y + (r() * 2 - 1) * (2 + density * 4)).toFixed(1)} `;
    }
    return path;
  }, [density, seed]);
  return (
    <Box>
      <g ref={ref}>
        <path d={d} fill="none" stroke={colour} strokeWidth={1.3 + density} strokeLinecap="round" opacity={0.75}>
          <animate attributeName="opacity" values="0.6;0.85;0.6" dur="3s" repeatCount="indefinite" />
        </path>
      </g>
    </Box>
  );
}

const Green: React.FC<Props> = ({ active }) => <Scribble density={0.72} colour={acc2} seed="green" active={active} />;
const Blue: React.FC<Props> = ({ active }) => <Scribble density={1.35} colour={acc} seed="blue" active={active} />;

/* ------------------------------------------------------------------ */

export const MORE_DOODLES: Record<string, React.FC<Props>> = {
  tent: Tent,
  rainleaf: RainLeaf,
  snow: Snow,
  leaves: Leaves,
  rapids: Rapids,
  waterfall: Waterfall,
  underwater: Underwater,
  drip: Drip,
  cicada: Cicada,
  frog: Frog,
  owl: Owl,
  bird: Bird,
  cafe: Cafe,
  plate: Plate,
  glass: Glass,
  market: Market,
  desk: Desk,
  door: Door,
  book: Book,
  bell: Bell,
  gong: Gong,
  flute: Flute,
  rainstick: Rainstick,
  drone: Drone,
  drone2: Drone2,
  keyboard2: Keyboard2,
  keyboard3: Keyboard3,
  keyboard4: Keyboard4,
  typewriter: Typewriter,
  pen: Pen,
  clock: Clock,
  fridge: Fridge,
  washing: Washing,
  kettle: Kettle,
  heart: Heart,
  train: Train,
  traffic: Traffic,
  green: Green,
  blue: Blue,
};

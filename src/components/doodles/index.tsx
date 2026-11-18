"use client";

import { useMemo } from "react";
import { RoughCircle, RoughLine } from "@/components/Rough";
import { useMotion } from "@/lib/useMotion";
import { hashString, seeded } from "@/lib/rough";
import type { Pt } from "@/lib/rough";
import { MORE_DOODLES } from "./more";

/**
 * One doodle per sound, drawn in a 64 x 64 box.
 *
 * These are the reactive layer: they are paths rather than pictures precisely
 * so they can be driven by the analyser. A rendered image cannot flicker in
 * time with a fire or lean with a gust; a path can.
 */

const S = 64;
const ink = "var(--ink)";
const acc = "var(--accent)";

type Props = { active: boolean; id: string };

function Box({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-full w-full overflow-visible" aria-hidden>
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* rain family                                                         */
/* ------------------------------------------------------------------ */

function Cloud({ y = 22, w = 1 }: { y?: number; w?: number }) {
  return (
    <>
      <RoughCircle cx={24} cy={y} r={9 * w} seedKey="cl1" stroke={ink} strokeWidth={2} />
      <RoughCircle cx={36} cy={y - 3} r={11 * w} seedKey="cl2" stroke={ink} strokeWidth={2} />
      <RoughCircle cx={46} cy={y + 1} r={8 * w} seedKey="cl3" stroke={ink} strokeWidth={2} />
    </>
  );
}

function Drops({ n, seed, top = 34 }: { n: number; seed: string; top?: number }) {
  const drops = useMemo(() => {
    const r = seeded(hashString(seed));
    return Array.from({ length: n }, () => ({
      x: 14 + r() * 38,
      delay: -r() * 1.6,
      dur: 0.9 + r() * 0.7,
      len: 5 + r() * 5,
    }));
  }, [n, seed]);
  return (
    <>
      {drops.map((d, i) => (
        <g key={i} className="anim-fall" style={{ "--d": `${d.dur}s`, animationDelay: `${d.delay}s` } as React.CSSProperties}>
          <path
            d={`M ${d.x} ${top} l -1.5 ${d.len}`}
            stroke={acc}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
    </>
  );
}

const Rain = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 3, scale: 0.05, phase: 0.2 });
  return (
    <Box>
      <g ref={ref}>
        <Cloud />
        <Drops n={5} seed="rain" />
      </g>
    </Box>
  );
};

const Downpour = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 4, scale: 0.06, phase: 1.1 });
  return (
    <Box>
      <g ref={ref}>
        <Cloud y={20} w={1.1} />
        <Drops n={11} seed="downpour" top={32} />
      </g>
    </Box>
  );
};

const Window = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 2, scale: 0.03, tilt: 0.8 });
  const beads = useMemo(() => {
    const r = seeded(hashString("beads"));
    return Array.from({ length: 7 }, () => ({ x: 16 + r() * 32, y: 14 + r() * 32, s: 1.2 + r() * 2 }));
  }, []);
  return (
    <Box>
      <g ref={ref}>
        <RoughLine points={[[12, 10], [52, 10], [52, 52], [12, 52], [12, 10]] as Pt[]} seedKey="win" stroke={ink} strokeWidth={2.2} />
        <RoughLine points={[[32, 10], [32, 52]] as Pt[]} seedKey="winv" stroke={ink} strokeWidth={1.6} opacity={0.6} />
        <RoughLine points={[[12, 31], [52, 31]] as Pt[]} seedKey="winh" stroke={ink} strokeWidth={1.6} opacity={0.6} />
        {beads.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.s} fill={acc} opacity={0.65}>
            <animate attributeName="cy" values={`${b.y};${b.y + 6};${b.y}`} dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    </Box>
  );
};

const Thunder = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "bass", lift: 5, scale: 0.12, punch: 1.6, tilt: 3 });
  return (
    <Box>
      <g ref={ref}>
        <Cloud y={20} />
        <path
          d="M 34 30 L 26 44 L 33 44 L 28 56 L 42 40 L 34 40 L 40 30 Z"
          fill={acc}
          stroke={ink}
          strokeWidth={1.6}
          strokeLinejoin="round"
        >
          <animate attributeName="opacity" values="1;1;0.25;1;0.6;1" dur="4.5s" repeatCount="indefinite" />
        </path>
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* fire                                                                */
/* ------------------------------------------------------------------ */

const Fire = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 4, scale: 0.1, punch: 1.2 });
  return (
    <Box>
      <g ref={ref}>
        <g className="anim-flicker" style={{ transformOrigin: "32px 46px" }}>
          <path
            d="M 32 12 C 40 22, 44 26, 44 34 C 44 43, 38 48, 32 48 C 26 48, 20 43, 20 34 C 20 27, 26 22, 32 12 Z"
            fill={acc}
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path
            d="M 32 26 C 36 31, 37 34, 37 37 C 37 42, 35 45, 32 45 C 29 45, 27 42, 27 37 C 27 34, 29 31, 32 26 Z"
            fill="var(--paper)"
            opacity={0.55}
            stroke="none"
          />
        </g>
        <RoughLine points={[[16, 52], [48, 48]] as Pt[]} seedKey="log1" stroke={ink} strokeWidth={3} />
        <RoughLine points={[[18, 48], [46, 53]] as Pt[]} seedKey="log2" stroke={ink} strokeWidth={3} />
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* wind                                                                */
/* ------------------------------------------------------------------ */

const Wind = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 2, scale: 0.04, tilt: 4 });
  return (
    <Box>
      <g ref={ref}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path
              d={`M 10 ${22 + i * 10} C 24 ${18 + i * 10}, 36 ${26 + i * 10}, 46 ${21 + i * 10} C 52 ${18 + i * 10}, 52 ${12 + i * 10}, 47 ${13 + i * 10} C 43 ${14 + i * 10}, 44 ${19 + i * 10}, 48 ${20 + i * 10}`}
              fill="none"
              stroke={i === 1 ? acc : ink}
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <animate
                attributeName="stroke-dasharray"
                values="0 90;60 90;90 0"
                dur={`${3 + i * 0.7}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}
      </g>
    </Box>
  );
};

const Mountain = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 3, scale: 0.05, tilt: 1.5 });
  return (
    <Box>
      <g ref={ref}>
        <RoughLine points={[[8, 50], [24, 22], [34, 36], [42, 26], [56, 50]] as Pt[]} seedKey="mtn" stroke={ink} strokeWidth={2.4} />
        <path d="M 19 31 L 24 23 L 29 31 C 26 29, 22 33, 19 31 Z" fill={acc} stroke="none" opacity={0.8} />
        <path d="M 12 18 C 20 14, 28 20, 36 15" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} className="anim-sway" style={{ transformOrigin: "24px 17px" }} />
      </g>
    </Box>
  );
};

const Chime = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 2, scale: 0.05, punch: 1.4 });
  return (
    <Box>
      <g ref={ref}>
        <RoughLine points={[[16, 14], [48, 14]] as Pt[]} seedKey="chbar" stroke={ink} strokeWidth={2.4} />
        {[20, 32, 44].map((x, i) => (
          <g key={x} className="anim-sway" style={{ "--d": `${2.2 + i * 0.6}s`, transformOrigin: `${x}px 14px` } as React.CSSProperties}>
            <line x1={x} y1={14} x2={x} y2={28} stroke={ink} strokeWidth={1.2} />
            <rect x={x - 3.2} y={28} width={6.4} height={i === 1 ? 22 : 16} rx={3} fill={i === 1 ? acc : "none"} stroke={ink} strokeWidth={2} />
          </g>
        ))}
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* water                                                               */
/* ------------------------------------------------------------------ */

const Wave = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "bass", lift: 4, scale: 0.06, tilt: 1.2 });
  return (
    <Box>
      <g ref={ref}>
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M 6 ${28 + i * 9} C 16 ${22 + i * 9}, 22 ${34 + i * 9}, 32 ${28 + i * 9} C 42 ${22 + i * 9}, 48 ${34 + i * 9}, 58 ${28 + i * 9}`}
            fill="none"
            stroke={i === 0 ? acc : ink}
            strokeWidth={2.4}
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-6 0; 6 0; -6 0"
              dur={`${4 + i}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
      </g>
    </Box>
  );
};

const Stream = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 2, scale: 0.04 });
  return (
    <Box>
      <g ref={ref}>
        <path d="M 14 10 C 26 20, 18 28, 28 36 C 38 44, 30 50, 40 56" fill="none" stroke={acc} strokeWidth={3} strokeLinecap="round" />
        <path d="M 24 10 C 36 20, 28 28, 38 36 C 48 44, 40 50, 50 56" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        <RoughCircle cx={18} cy={44} r={5} seedKey="rock1" stroke={ink} fill="var(--paper-3)" strokeWidth={2} />
        <RoughCircle cx={48} cy={24} r={4} seedKey="rock2" stroke={ink} fill="var(--paper-3)" strokeWidth={2} />
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* night                                                               */
/* ------------------------------------------------------------------ */

const Cricket = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 3, scale: 0.09, punch: 1.8, tilt: 3 });
  return (
    <Box>
      <g ref={ref}>
        <ellipse cx={32} cy={36} rx={13} ry={8} fill="var(--paper-3)" stroke={ink} strokeWidth={2} transform="rotate(-10 32 36)" />
        <RoughCircle cx={19} cy={31} r={5} seedKey="crhead" stroke={ink} fill={acc} strokeWidth={2} />
        <path d="M 16 28 C 10 22, 8 18, 10 14" fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" className="anim-sway" style={{ transformOrigin: "16px 28px" }} />
        <path d="M 18 26 C 14 19, 16 15, 20 12" fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" className="anim-sway" style={{ "--d": "2.1s", transformOrigin: "18px 26px" } as React.CSSProperties} />
        <path d="M 30 42 L 26 52 M 38 42 L 40 52 M 44 38 L 52 46" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
        {[1, 2].map((i) => (
          <circle key={i} cx={50} cy={24} r={3 + i * 2} fill="none" stroke={acc} strokeWidth={1.4} className="anim-ripple" style={{ "--d": `${1.6 + i * 0.5}s`, transformOrigin: "50px 24px" } as React.CSSProperties} />
        ))}
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* zen                                                                 */
/* ------------------------------------------------------------------ */

const Bowl = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 2, scale: 0.07, punch: 1.6 });
  return (
    <Box>
      <g ref={ref}>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={32} cy={34} rx={16} ry={6} fill="none" stroke={acc} strokeWidth={1.4} className="anim-ripple" style={{ "--d": `${2.4 + i * 0.8}s`, transformOrigin: "32px 34px" } as React.CSSProperties} />
        ))}
        <path d="M 16 34 C 16 46, 24 52, 32 52 C 40 52, 48 46, 48 34 Z" fill="var(--paper-3)" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
        <ellipse cx={32} cy={34} rx={16} ry={5} fill="var(--paper-2)" stroke={ink} strokeWidth={2.2} />
        <g className="anim-sway" style={{ transformOrigin: "50px 14px" }}>
          <line x1={50} y1={14} x2={44} y2={30} stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={43} cy={32} r={3.4} fill={ink} />
        </g>
      </g>
    </Box>
  );
};

const Bamboo = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "bass", lift: 2, scale: 0.05, tilt: 4, punch: 2 });
  return (
    <Box>
      <g ref={ref}>
        <g className="anim-sway" style={{ "--d": "5s", transformOrigin: "38px 22px" } as React.CSSProperties}>
          <rect x={14} y={16} width={34} height={11} rx={5} fill="var(--paper-3)" stroke={ink} strokeWidth={2.2} transform="rotate(-18 31 22)" />
          <line x1={28} y1={17} x2={26} y2={27} stroke={ink} strokeWidth={1.4} opacity={0.6} transform="rotate(-18 31 22)" />
        </g>
        <path d="M 16 30 C 15 38, 17 44, 16 50" fill="none" stroke={acc} strokeWidth={2.4} strokeLinecap="round" />
        <RoughCircle cx={34} cy={50} r={8} seedKey="stone" stroke={ink} fill="var(--paper-3)" strokeWidth={2.2} />
        <ellipse cx={34} cy={50} rx={11} ry={3} fill="none" stroke={acc} strokeWidth={1.3} className="anim-ripple" style={{ transformOrigin: "34px 50px" }} />
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* room                                                                */
/* ------------------------------------------------------------------ */

const Keyboard = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "air", lift: 2, scale: 0.05, punch: 1.5 });
  const keys = useMemo(() => {
    const out: { x: number; y: number; d: number }[] = [];
    const r = seeded(hashString("keys"));
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 6; col++)
        out.push({ x: 15 + col * 6.2 + row * 1.6, y: 30 + row * 7, d: r() * 2.2 });
    return out;
  }, []);
  return (
    <Box>
      <g ref={ref}>
        <path d="M 10 26 L 54 26 L 58 52 L 6 52 Z" fill="var(--paper-3)" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
        {keys.map((k, i) => (
          <rect key={i} x={k.x} y={k.y} width={4.4} height={4.4} rx={1.2} fill={ink} opacity={0.35}>
            <animate attributeName="opacity" values="0.3;0.3;0.9;0.3" dur="2.4s" begin={`${k.d}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <path d="M 24 20 C 26 14, 32 14, 34 18" fill="none" stroke={acc} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </g>
    </Box>
  );
};

const Fan = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "mid", lift: 1.5, scale: 0.04 });
  return (
    <Box>
      <g ref={ref}>
        <RoughCircle cx={32} cy={28} r={18} seedKey="fancage" stroke={ink} strokeWidth={2.2} fill="var(--paper-2)" />
        <g className="anim-spin" style={{ "--d": "2.4s", transformOrigin: "32px 28px" } as React.CSSProperties}>
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              d="M 32 28 C 38 20, 44 20, 44 26 C 44 31, 37 30, 32 28 Z"
              fill={acc}
              stroke={ink}
              strokeWidth={1.6}
              transform={`rotate(${a} 32 28)`}
            />
          ))}
        </g>
        <circle cx={32} cy={28} r={3} fill={ink} />
        <line x1={32} y1={46} x2={32} y2={54} stroke={ink} strokeWidth={2.4} />
        <RoughLine points={[[22, 55], [42, 55]] as Pt[]} seedKey="fanbase" stroke={ink} strokeWidth={2.4} />
      </g>
    </Box>
  );
};

const Plane = ({ active }: Props) => {
  const ref = useMotion<SVGGElement>({ active, band: "bass", lift: 3, scale: 0.04, tilt: 1.6 });
  return (
    <Box>
      <g ref={ref}>
        <RoughCircle cx={32} cy={30} r={17} seedKey="porthole" stroke={ink} strokeWidth={2.6} fill="var(--wash)" />
        <RoughCircle cx={32} cy={30} r={12} seedKey="porthole2" stroke={ink} strokeWidth={1.4} opacity={0.4} />
        <path d="M 22 34 C 27 30, 31 34, 36 30 C 40 27, 43 30, 44 29" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
        <g className="anim-bobble">
          <path d="M 25 24 L 34 21 L 39 25 L 31 27 Z" fill={acc} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
        </g>
        <path d="M 14 50 C 24 46, 40 46, 50 50" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      </g>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* noise colours: scribbles of increasing density                      */
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
      for (let x = 16; x <= 52; x += 6) {
        path += `L ${x} ${(y + (r() * 2 - 1) * (2 + density * 4)).toFixed(1)} `;
      }
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

const White = ({ active }: Props) => <Scribble density={1} colour={ink} seed="white" active={active} />;
const Pink = ({ active }: Props) => <Scribble density={0.55} colour={acc} seed="pink" active={active} />;
const Brown = ({ active }: Props) => <Scribble density={0.22} colour="var(--accent-2)" seed="brown" active={active} />;

/* ------------------------------------------------------------------ */

export const DOODLES: Record<string, React.FC<Props>> = {
  ...MORE_DOODLES,
  rain: Rain,
  downpour: Downpour,
  window: Window,
  thunder: Thunder,
  fire: Fire,
  wind: Wind,
  mountain: Mountain,
  chime: Chime,
  wave: Wave,
  stream: Stream,
  cricket: Cricket,
  bowl: Bowl,
  bamboo: Bamboo,
  keyboard: Keyboard,
  fan: Fan,
  plane: Plane,
  white: White,
  pink: Pink,
  brown: Brown,
};

export function Doodle({ name, active, id }: { name: string; active: boolean; id: string }) {
  const C = DOODLES[name] ?? Rain;
  return <C active={active} id={id} />;
}

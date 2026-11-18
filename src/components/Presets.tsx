"use client";

import { PRESETS } from "@/audio/catalogue";
import { RoughBorder } from "@/components/Rough";
import { useDhvani } from "@/lib/store";
import { useMotion } from "@/lib/useMotion";

export function Presets() {
  const apply = useDhvani((s) => s.applyPreset);
  return (
    <section aria-labelledby="presets-heading">
      <header className="mb-3 flex items-baseline gap-2.5 pl-1">
        <h2 id="presets-heading" className="hand text-xl leading-none" style={{ color: "var(--ink)" }}>
          Start somewhere
        </h2>
        <span className="jp text-sm leading-none" style={{ color: "var(--accent)" }}>
          下地
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {PRESETS.map((p, i) => (
          <PresetCard key={p.id} id={p.id} index={i} onClick={() => apply(p)} name={p.name} jp={p.jp} blurb={p.blurb} />
        ))}
      </div>
    </section>
  );
}

function PresetCard({
  id,
  index,
  name,
  jp,
  blurb,
  onClick,
}: {
  id: string;
  index: number;
  name: string;
  jp: string;
  blurb: string;
  onClick: () => void;
}) {
  const ref = useMotion<HTMLButtonElement>({
    active: false,
    lift: 0,
    scale: 0,
    idle: 0.6,
    phase: index * 1.3,
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="relative px-3 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
      style={{ background: "var(--paper-2)", borderRadius: 16 }}
    >
      <RoughBorder seedKey={`preset-${id}`} radius={16} stroke="var(--ink)" strokeWidth={1.6} opacity={0.42} />
      <span className="relative z-10 flex items-baseline gap-1.5">
        <span className="hand text-base" style={{ color: "var(--ink)" }}>
          {name}
        </span>
        <span className="jp text-[0.6rem]" style={{ color: "var(--accent)" }}>
          {jp}
        </span>
      </span>
      <span className="relative z-10 mt-1 block text-[0.7rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
        {blurb}
      </span>
    </button>
  );
}

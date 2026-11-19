"use client";

import { useState } from "react";
import { PRESETS, SOUND_BY_ID, type Preset } from "@/audio/catalogue";
import { Doodle } from "@/components/doodles";
import { RoughBorder } from "@/components/Rough";
import { useDhvani } from "@/lib/store";
import { useMotion } from "@/lib/useMotion";
import { useLite } from "@/lib/perf";

/**
 * Ways in.
 *
 * Twelve identically-weighted cards under a heading that says "start
 * somewhere" is the opposite of starting somewhere: it is twelve decisions
 * where there should be one. Three are given real size and their own drawing,
 * and the rest wait behind a line of text until somebody wants them.
 */

const FEATURED = 3;

export function Presets() {
  const apply = useDhvani((s) => s.applyPreset);
  const [showAll, setShowAll] = useState(false);
  const featured = PRESETS.slice(0, FEATURED);
  const rest = PRESETS.slice(FEATURED);

  return (
    <section aria-labelledby="presets-heading">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pl-1">
        <h2 id="presets-heading" className="hand text-xl leading-none" style={{ color: "var(--ink)" }}>
          Start somewhere
        </h2>
        <span className="jp text-sm leading-none" style={{ color: "var(--accent-text)" }}>
          下地
        </span>
        <span className="basis-full text-[0.78rem] leading-snug sm:basis-auto" style={{ color: "var(--ink-soft)" }}>
          a mix already made, which you can then pull apart
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {featured.map((p, i) => (
          <Big key={p.id} preset={p} index={i} onClick={() => apply(p)} />
        ))}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="hand tap text-[0.88rem] underline-offset-4 hover:underline"
          style={{ color: "var(--accent-text)" }}
          aria-expanded={showAll}
          aria-controls="more-presets"
        >
          {showAll ? "fewer ways in" : `${rest.length} more ways in`}
        </button>

        <div
          id="more-presets"
          className="grid gap-2 overflow-hidden transition-all duration-500 sm:grid-cols-3 lg:grid-cols-5"
          style={{ marginTop: showAll ? 12 : 0, maxHeight: showAll ? 600 : 0, opacity: showAll ? 1 : 0 }}
          inert={!showAll}
        >
          {rest.map((p, i) => (
            <Small key={p.id} preset={p} index={i} onClick={() => apply(p)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** The doodle of the loudest thing in the mix, as the preset's face. */
function faceOf(preset: Preset) {
  const top = Object.entries(preset.mix).sort((a, b) => b[1] - a[1])[0];
  return top ? (SOUND_BY_ID[top[0]]?.doodle ?? "rain") : "rain";
}

function Big({ preset, index, onClick }: { preset: Preset; index: number; onClick: () => void }) {
  const lite = useLite();
  const ref = useMotion<HTMLDivElement>({ active: false, lift: 0, scale: 0, idle: 0.7, phase: index * 1.3 });
  return (
    <div ref={ref} className={`relative ${lite ? "" : "will-change-transform"}`}>
      <button type="button" onClick={onClick} className="group block w-full text-left">
        <span
          className="relative flex items-start gap-3 rounded-[18px] px-4 py-4 transition-transform duration-200 group-hover:-translate-y-[3px] group-active:scale-95"
          style={{ background: "var(--paper-2)" }}
        >
          <RoughBorder seedKey={`preset-${preset.id}`} radius={18} stroke="var(--ink)" strokeWidth={1.9} opacity={0.5} />
          <span className="relative z-10 h-12 w-12 shrink-0" style={{ opacity: 0.7 }}>
            <Doodle name={faceOf(preset)} active={false} id={`preset-${preset.id}`} />
          </span>
          <span className="relative z-10 min-w-0">
            <span className="flex items-baseline gap-1.5">
              <span className="hand text-[1.1rem] leading-none" style={{ color: "var(--ink)" }}>
                {preset.name}
              </span>
              <span className="jp text-[0.62rem] leading-none" style={{ color: "var(--accent-text)" }}>
                {preset.jp}
              </span>
            </span>
            <span className="mt-1 block text-[0.76rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
              {preset.blurb}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

function Small({ preset, index, onClick }: { preset: Preset; index: number; onClick: () => void }) {
  const lite = useLite();
  const ref = useMotion<HTMLDivElement>({ active: false, lift: 0, scale: 0, idle: 0.5, phase: index * 0.9 });
  return (
    <div ref={ref} className={`relative ${lite ? "" : "will-change-transform"}`}>
      <button type="button" onClick={onClick} className="group block w-full text-left">
        <span
          className="relative block rounded-[14px] px-3 py-2.5 transition-transform duration-200 group-hover:-translate-y-[2px] group-active:scale-95"
          style={{ background: "var(--paper-2)" }}
        >
          <RoughBorder seedKey={`preset-${preset.id}`} radius={14} stroke="var(--ink)" strokeWidth={1.4} opacity={0.38} />
          <span className="relative z-10 flex items-baseline gap-1.5">
            <span className="hand text-[0.95rem] leading-none" style={{ color: "var(--ink)" }}>
              {preset.name}
            </span>
            <span className="jp text-[0.56rem] leading-none" style={{ color: "var(--accent-text)" }}>
              {preset.jp}
            </span>
          </span>
          <span className="relative z-10 mt-1 block text-[0.7rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
            {preset.blurb}
          </span>
        </span>
      </button>
    </div>
  );
}

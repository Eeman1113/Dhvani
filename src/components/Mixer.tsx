"use client";

import { GROUPS, SOUNDS } from "@/audio/catalogue";
import { SoundCard } from "@/components/SoundCard";

export function Mixer() {
  // Precomputed, rather than mutating a counter during render. The phase
  // offset only exists so a row of cards does not breathe in lockstep.
  let offset = 0;
  const offsets = new Map<string, number>();
  for (const g of GROUPS) {
    offsets.set(g.id, offset);
    offset += SOUNDS.filter((s) => s.group === g.id).length;
  }
  return (
    <div className="flex flex-col gap-10">
      {GROUPS.map((g) => {
        const sounds = SOUNDS.filter((s) => s.group === g.id);
        if (!sounds.length) return null;
        return (
          <section key={g.id} aria-labelledby={`group-${g.id}`}>
            <header className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pl-1">
              <h2
                id={`group-${g.id}`}
                className="hand text-xl leading-none"
                style={{ color: "var(--ink)" }}
              >
                {g.name}
              </h2>
              <span className="jp text-sm leading-none" style={{ color: "var(--accent-text)" }}>
                {g.jp}
              </span>
              <span
                className="basis-full text-[0.78rem] leading-snug sm:basis-auto"
                style={{ color: "var(--ink-soft)" }}
              >
                {g.blurb}
              </span>
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sounds.map((s, i) => (
                <SoundCard key={s.id} sound={s} index={(offsets.get(g.id) ?? 0) + i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

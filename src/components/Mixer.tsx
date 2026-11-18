"use client";

import { GROUPS, SOUNDS } from "@/audio/catalogue";
import { SoundCard } from "@/components/SoundCard";

export function Mixer() {
  let index = 0;
  return (
    <div className="flex flex-col gap-10">
      {GROUPS.map((g) => {
        const sounds = SOUNDS.filter((s) => s.group === g.id);
        if (!sounds.length) return null;
        return (
          <section key={g.id} aria-labelledby={`group-${g.id}`}>
            <header className="mb-3 flex items-baseline gap-2.5 pl-1">
              <h2
                id={`group-${g.id}`}
                className="hand text-xl leading-none"
                style={{ color: "var(--ink)" }}
              >
                {g.name}
              </h2>
              <span className="jp text-sm leading-none" style={{ color: "var(--accent)" }}>
                {g.jp}
              </span>
              <span
                className="hidden text-[0.78rem] leading-none sm:inline"
                style={{ color: "var(--ink-soft)" }}
              >
                {g.blurb}
              </span>
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sounds.map((s) => (
                <SoundCard key={s.id} sound={s} index={index++} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

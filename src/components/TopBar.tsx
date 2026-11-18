"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RoughBorder } from "@/components/Rough";
import { useDhvani } from "@/lib/store";
import { THEMES } from "@/lib/themes";

const TIMER_OPTIONS = [25, 50, 90, 180, 480];

function Timer() {
  const timerEndsAt = useDhvani((s) => s.timerEndsAt);
  const setTimer = useDhvani((s) => s.setTimer);
  const clear = useDhvani((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!timerEndsAt) {
      setLeft(null);
      fired.current = false;
      return;
    }
    const tick = () => {
      const ms = timerEndsAt - Date.now();
      setLeft(ms);
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        clear();
        setTimer(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerEndsAt, clear, setTimer]);

  const label =
    left === null
      ? "timer"
      : `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative px-3 py-1.5 transition-transform active:scale-95"
        aria-expanded={open}
      >
        <RoughBorder
          seedKey="timer-btn"
          radius={12}
          stroke={left !== null ? "var(--accent)" : "var(--ink)"}
          strokeWidth={left !== null ? 2.2 : 1.4}
          opacity={left !== null ? 1 : 0.4}
        />
        <span className="hand relative z-10 text-sm" style={{ color: "var(--ink)" }}>
          {label}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 flex w-44 flex-col gap-1 rounded-2xl p-2"
          style={{ background: "var(--paper-2)", boxShadow: "0 8px 28px -12px rgba(0,0,0,0.3)" }}
        >
          <RoughBorder seedKey="timer-pop" radius={16} stroke="var(--ink)" strokeWidth={1.6} opacity={0.5} />
          {TIMER_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setTimer(m);
                setOpen(false);
              }}
              className="relative z-10 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--paper-3)]"
              style={{ color: "var(--ink)" }}
            >
              <span className="hand">
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setTimer(null);
              setOpen(false);
            }}
            className="relative z-10 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--paper-3)]"
            style={{ color: "var(--ink-soft)" }}
          >
            <span className="hand">no end</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeSwitcher() {
  const theme = useDhvani((s) => s.theme);
  const setTheme = useDhvani((s) => s.setTheme);
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Paper">
      {THEMES.map((t) => {
        const on = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={`${t.name} ${t.jp}, ${t.mood}`}
            aria-label={`${t.name} theme`}
            aria-pressed={on}
            className="relative h-6 w-6 rounded-full transition-transform duration-200 hover:scale-125"
            style={{
              background: t.colors.paper,
              border: `2px solid ${on ? t.colors.accent : t.colors.line}`,
              transform: on ? "scale(1.22)" : undefined,
              boxShadow: on ? `0 0 0 2px color-mix(in oklab, ${t.colors.accent} 35%, transparent)` : undefined,
            }}
          >
            <span
              className="absolute inset-[3px] rounded-full"
              style={{ background: t.colors.accent, opacity: on ? 1 : 0.5 }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function TopBar() {
  const master = useDhvani((s) => s.master);
  const setMaster = useDhvani((s) => s.setMaster);
  const levels = useDhvani((s) => s.levels);
  const music = useDhvani((s) => s.music);
  const clear = useDhvani((s) => s.clear);
  const playing = Object.keys(levels).length + (music ? 1 : 0);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-[2px]"
      style={{ background: "color-mix(in oklab, var(--paper) 86%, transparent)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2.5" aria-label="Dhvani, home">
          <Logo height={38} />
          <span className="hand hidden text-lg sm:inline" style={{ color: "var(--ink-soft)" }}>
            dhvani
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <label className="hidden items-center gap-2 sm:flex">
            <span className="hand text-sm" style={{ color: "var(--ink-soft)" }}>
              all
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={master}
              onChange={(e) => setMaster(Number(e.target.value))}
              className="ink-slider w-28"
              aria-label="Master volume"
            />
          </label>

          <ThemeSwitcher />
          <Timer />

          {playing > 0 && (
            <button
              type="button"
              onClick={clear}
              className="hand text-sm underline-offset-4 hover:underline"
              style={{ color: "var(--ink-soft)" }}
            >
              stop all
            </button>
          )}

          <Link
            href="/credits"
            className="hand text-sm underline-offset-4 hover:underline"
            style={{ color: "var(--ink-soft)" }}
          >
            credits
          </Link>
        </div>
      </div>
    </header>
  );
}

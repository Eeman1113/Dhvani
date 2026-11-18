"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RoughBorder, RoughCircle } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timerEndsAt) {
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
    const id = setInterval(tick, 1000);
    tick();
    return () => {
      clearInterval(id);
      setLeft(null);
    };
  }, [timerEndsAt, clear, setTimer]);

  // Clamped: tick() sets the value before the <= 0 branch clears it, so an
  // unclamped render could flash "-1h 0m" on the way out.
  const ms = left === null ? null : Math.max(0, left);
  const label =
    ms === null
      ? "timer"
      : ms >= 3600000
        ? `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
        : ms >= 60000
          ? `${Math.floor(ms / 60000)}m`
          : `${Math.ceil(ms / 1000)}s`;

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative px-3 py-1.5 transition-transform active:scale-95"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="timer-menu"
        aria-label={ms === null ? "Set a sleep timer" : `Sleep timer, ${label} left`}
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
          ref={popRef}
          id="timer-menu"
          role="menu"
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
              role="menuitem"
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
            role="menuitem"
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
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Paper">
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
            className="relative h-7 w-7 transition-transform duration-200 hover:scale-115"
            style={{ transform: on ? "scale(1.18)" : undefined }}
          >
            {/* Drawn, not geometric. These sit in the top bar permanently and
                were the one component opting out of the whole drawing system. */}
            <svg viewBox="0 0 28 28" className="h-full w-full overflow-visible">
              <RoughCircle
                cx={14}
                cy={14}
                r={11}
                seedKey={`sw-${t.id}`}
                stroke={on ? t.colors.accent : t.colors.line}
                fill={t.colors.paper}
                strokeWidth={on ? 2.4 : 1.8}
                amp={1}
              />
              <RoughCircle
                cx={14}
                cy={14}
                r={5.5}
                seedKey={`swi-${t.id}`}
                stroke="none"
                fill={t.colors.accent}
                strokeWidth={0}
                amp={0.9}
                opacity={on ? 1 : 0.55}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export function TopBar() {
  const master = useDhvani((s) => s.master);
  const setMaster = useDhvani((s) => s.setMaster);
  const clear = useDhvani((s) => s.clear);
  // A count, not the object: a fresh levels object on every change re-rendered
  // the whole header, logo and border included, on every drag frame.
  const playing = useDhvani((s) => Object.keys(s.levels).length + (s.music ? 1 : 0));

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

        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          {/* The only way to pull everything down without losing the mix, so
              it cannot be the thing that disappears on a phone. */}
          <label className="order-last flex basis-full items-center gap-2 sm:order-none sm:basis-auto">
            <span className="hand text-sm" style={{ color: "var(--ink-soft)" }}>
              all
            </span>
            <span className="w-full sm:w-28">
              <InkSlider
                value={master}
                onChange={setMaster}
                seed="master"
                label="Master volume"
              />
            </span>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RoughBorder, RoughCircle } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
import { useDhvani } from "@/lib/store";
import { THEMES } from "@/lib/themes";
import { setTier, useTier } from "@/lib/perf";

/**
 * The top bar.
 *
 * Mobile first, because this is sticky and a phone screen is mostly vertical:
 * an earlier version simply let the desktop row wrap, which produced four
 * stacked lines and ate a fifth of an 844 px screen permanently.
 *
 * What stays visible on a phone is what gets used constantly, which is the
 * master fader and a way to stop. Papers, the sleep timer and the credits link
 * move into a sheet behind one button, and come back inline from `sm` up.
 */

const TIMER_OPTIONS = [25, 50, 90, 180, 480];

/**
 * Escape and click-outside for a popover.
 *
 * The refs are passed individually rather than in an array because building
 * the array during render, or stashing it in another ref, reads a ref in the
 * render phase, which is not safe under concurrent rendering.
 */
function useDismiss(
  open: boolean,
  close: () => void,
  a: React.RefObject<HTMLElement | null>,
  b: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!a.current?.contains(t) && !b.current?.contains(t)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, a, b]);
}

function timerLabel(ms: number | null) {
  if (ms === null) return "timer";
  const v = Math.max(0, ms);
  if (v >= 3600000) return `${Math.floor(v / 3600000)}h ${Math.floor((v % 3600000) / 60000)}m`;
  if (v >= 60000) return `${Math.floor(v / 60000)}m`;
  return `${Math.ceil(v / 1000)}s`;
}

/** Shared by the desktop popover and the mobile sheet. */
function useTimer() {
  const timerEndsAt = useDhvani((s) => s.timerEndsAt);
  const setTimer = useDhvani((s) => s.setTimer);
  const clear = useDhvani((s) => s.clear);
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);

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

  return { left, setTimer, running: timerEndsAt !== null };
}

function TimerOptions({ onPick }: { onPick: (m: number | null) => void }) {
  return (
    <>
      {TIMER_OPTIONS.map((m) => (
        <button
          key={m}
          type="button"
          role="menuitem"
          onClick={() => onPick(m)}
          className="tap relative z-10 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--paper-3)]"
          style={{ color: "var(--ink)" }}
        >
          <span className="hand">
            {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
          </span>
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        onClick={() => onPick(null)}
        className="tap relative z-10 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--paper-3)]"
        style={{ color: "var(--ink-soft)" }}
      >
        <span className="hand">no end</span>
      </button>
    </>
  );
}

function Swatches({ size = 28 }: { size?: number }) {
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
            className="tap-sq relative transition-transform duration-200 hover:scale-110"
            style={{ width: size, height: size, transform: on ? "scale(1.14)" : undefined }}
          >
            <svg viewBox="0 0 28 28" className="h-full w-full overflow-visible">
              <RoughCircle
                cx={14} cy={14} r={11}
                seedKey={`sw-${t.id}`}
                stroke={on ? t.colors.accent : t.colors.line}
                fill={t.colors.paper}
                strokeWidth={on ? 2.4 : 1.8}
                amp={1}
              />
              <RoughCircle
                cx={14} cy={14} r={5.5}
                seedKey={`swi-${t.id}`}
                stroke="none" fill={t.colors.accent} strokeWidth={0}
                amp={0.9} opacity={on ? 1 : 0.55}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Switch between the full drawing and the light one, at any time. */
function TierToggle({ block = false }: { block?: boolean }) {
  const tier = useTier();
  const lite = tier === "lite";
  return (
    <button
      type="button"
      onClick={() => setTier(lite ? "full" : "lite")}
      aria-pressed={lite}
      className={`tap hand underline-offset-4 hover:underline ${block ? "px-1 text-sm" : "text-sm"}`}
      style={{ color: lite ? "var(--accent-text)" : "var(--ink-soft)" }}
      title={
        lite
          ? "Currently drawing the light version. Every sound is the same either way."
          : "Draw less: no moving background, no particles, no redrawn lines. All sounds unchanged."
      }
    >
      {lite ? "light drawing is on" : "draw less"}
    </button>
  );
}

function DesktopTimer() {
  const { left, setTimer, running } = useTimer();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, triggerRef, popRef);

  const label = timerLabel(left);
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tap relative px-3 transition-transform active:scale-95"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="timer-menu"
        aria-label={running ? `Sleep timer, ${label} left` : "Set a sleep timer"}
      >
        <RoughBorder
          seedKey="timer-btn"
          radius={12}
          stroke={running ? "var(--accent)" : "var(--ink)"}
          strokeWidth={running ? 2.2 : 1.4}
          opacity={running ? 1 : 0.4}
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
          <TimerOptions
            onPick={(m) => {
              setTimer(m);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Everything that does not earn permanent space on a phone. */
function MobileSheet({ onClose }: { onClose: () => void }) {
  const { left, setTimer, running } = useTimer();
  return (
    <div
      id="more-menu"
      className="relative mx-3 mb-3 flex flex-col gap-3 rounded-2xl p-3 sm:hidden"
      style={{ background: "var(--paper-2)" }}
    >
      <RoughBorder seedKey="sheet" radius={18} stroke="var(--ink)" strokeWidth={1.7} opacity={0.5} />

      <div className="relative z-10">
        <p className="hand mb-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
          paper
        </p>
        <Swatches size={34} />
      </div>

      <div className="relative z-10">
        <p className="hand mb-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
          stop after {running ? timerLabel(left) : ""}
        </p>
        <div className="flex flex-wrap gap-1.5" role="menu">
          <TimerOptions
            onPick={(m) => {
              setTimer(m);
              onClose();
            }}
          />
        </div>
      </div>

      <div className="relative z-10">
        <p className="hand mb-1 text-sm" style={{ color: "var(--ink-soft)" }}>
          drawing
        </p>
        <TierToggle block />
        <p className="mt-0.5 text-[0.72rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
          The light version keeps every sound and both music modes. It just
          draws less, which helps an older machine.
        </p>
      </div>

      <Link
        href="/credits"
        onClick={onClose}
        className="hand tap relative z-10 px-1 text-sm underline-offset-4"
        style={{ color: "var(--accent-text)" }}
      >
        what it is made of, and who to thank
      </Link>
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
  const [menu, setMenu] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-[2px]"
      style={{
        background: "color-mix(in oklab, var(--paper) 88%, transparent)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-3 py-2 sm:gap-5 sm:px-6 sm:py-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-2.5" aria-label="Dhvani, home">
          <Logo height={32} />
          <span className="hand hidden text-lg sm:inline" style={{ color: "var(--ink-soft)" }}>
            dhvani
          </span>
        </Link>

        {/* The fader keeps the middle of the bar at every size. It is the one
            control people reach for without thinking. */}
        <label className="flex min-w-0 flex-1 items-center gap-2 sm:ml-auto sm:max-w-[9rem] sm:flex-none">
          <span className="hand hidden text-sm sm:inline" style={{ color: "var(--ink-soft)" }}>
            all
          </span>
          <span className="min-w-0 flex-1">
            <InkSlider value={master} onChange={setMaster} seed="master" label="Master volume" />
          </span>
        </label>

        {playing > 0 && (
          <button
            type="button"
            onClick={clear}
            className="tap hand shrink-0 px-1 text-sm underline-offset-4 hover:underline"
            style={{ color: "var(--ink-soft)" }}
            aria-label={`Stop all, ${playing} playing`}
          >
            stop
          </button>
        )}

        <div className="hidden items-center gap-4 sm:flex">
          <Swatches />
          <DesktopTimer />
          <TierToggle />
          <Link
            href="/credits"
            className="hand tap text-sm underline-offset-4 hover:underline"
            style={{ color: "var(--ink-soft)" }}
          >
            credits
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="tap-sq relative shrink-0 sm:hidden"
          aria-expanded={menu}
          aria-controls="more-menu"
          aria-label="Paper, timer and credits"
        >
          <svg viewBox="0 0 28 22" className="h-6 w-7 overflow-visible" aria-hidden>
            {[5, 11, 17].map((y, i) => (
              <path
                key={y}
                d={`M 3 ${y} C 10 ${y - 1.6 + i}, 18 ${y + 1.4 - i}, 25 ${y}`}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.75}
              />
            ))}
          </svg>
        </button>
      </div>

      {menu && <MobileSheet onClose={() => setMenu(false)} />}
    </header>
  );
}

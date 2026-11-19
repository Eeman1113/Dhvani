"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RoughBorder, RoughCircle } from "@/components/Rough";
import { InkSlider } from "@/components/InkSlider";
import { LiteSwitch } from "@/components/LiteSwitch";
import { useDhvani } from "@/lib/store";
import { THEMES } from "@/lib/themes";

/**
 * The top bar.
 *
 * It had grown to hold a mark, a wordmark, a labelled fader, a stop control,
 * six papers, a timer, a sentence about the rendering tier, a credits link
 * and a menu button, all on one line, and at most widths several of those
 * overlapped. The mark already says the name, so the wordmark was saying it
 * twice.
 *
 * What stays on the bar now is what is used while listening: the mark, the
 * master fader, and a way to stop. Everything that is set once and left
 * alone, which is the paper, the timer, lite mode and the credits, lives
 * behind one menu, and it is the same menu at every width rather than two
 * code paths that disagree.
 */

const TIMER_OPTIONS = [25, 50, 90, 180, 480];

function timerLabel(ms: number | null) {
  if (ms === null) return null;
  const v = Math.max(0, ms);
  if (v >= 3600000) return `${Math.floor(v / 3600000)}h ${Math.floor((v % 3600000) / 60000)}m`;
  if (v >= 60000) return `${Math.floor(v / 60000)}m`;
  return `${Math.ceil(v / 1000)}s`;
}

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

function Swatches() {
  const theme = useDhvani((s) => s.theme);
  const setTheme = useDhvani((s) => s.setTheme);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Paper">
      {THEMES.map((t) => {
        const on = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={`${t.name} ${t.jp}, ${t.mood}`}
            aria-label={`${t.name} paper`}
            aria-pressed={on}
            className="tap-sq inline-flex items-center justify-center transition-transform duration-200 hover:scale-110"
            style={{ transform: on ? "scale(1.12)" : undefined }}
          >
            <svg viewBox="0 0 28 28" className="h-7 w-7 overflow-visible" aria-hidden>
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
                amp={0.9} opacity={on ? 1 : 0.5}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Everything that is set once and then left alone. One menu, every width. */
function Menu({ onClose }: { onClose: () => void }) {
  const { left, setTimer, running } = useTimer();
  const label = timerLabel(left);

  return (
    <div
      id="settings-menu"
      className="absolute right-2 top-full z-50 w-[min(20rem,calc(100vw-1rem))] rounded-[20px] p-4 sm:right-4"
      style={{ background: "var(--paper-2)", boxShadow: "0 16px 44px -20px rgba(0,0,0,0.42)" }}
    >
      <RoughBorder seedKey="settings" radius={20} stroke="var(--ink)" strokeWidth={1.8} opacity={0.55} />

      <div className="relative z-10 flex flex-col gap-4">
        <section>
          <h3 className="hand mb-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            paper
          </h3>
          <Swatches />
        </section>

        <section>
          <h3 className="hand mb-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            {running ? `stopping in ${label}` : "stop after"}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TIMER_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setTimer(m);
                  onClose();
                }}
                className="tap relative inline-flex items-center px-3"
              >
                <RoughBorder seedKey={`t-${m}`} radius={11} stroke="var(--ink)" strokeWidth={1.3} opacity={0.4} />
                <span className="hand relative z-10 text-sm" style={{ color: "var(--ink)" }}>
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </span>
              </button>
            ))}
            {running && (
              <button
                type="button"
                onClick={() => {
                  setTimer(null);
                  onClose();
                }}
                className="tap inline-flex items-center px-2"
              >
                <span className="hand text-sm" style={{ color: "var(--ink-soft)" }}>
                  no end
                </span>
              </button>
            )}
          </div>
        </section>

        <section>
          <h3 className="hand mb-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            drawing
          </h3>
          <LiteSwitch withLabel />
          <p className="mt-1 text-[0.72rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
            Lite mode draws less, for an older machine. Every sound and both
            music modes stay exactly the same. It is not the paper colour.
          </p>
        </section>

        <Link
          href="/credits"
          onClick={onClose}
          className="hand tap inline-flex items-center text-sm underline-offset-4 hover:underline"
          style={{ color: "var(--accent-text)" }}
        >
          what it is made of, and who to thank
        </Link>
      </div>
    </div>
  );
}

export function TopBar() {
  const master = useDhvani((s) => s.master);
  const setMaster = useDhvani((s) => s.setMaster);
  const clear = useDhvani((s) => s.clear);
  const playing = useDhvani((s) => Object.keys(s.levels).length + (s.music ? 1 : 0));
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-40 backdrop-blur-[2px]"
      style={{
        background: "color-mix(in oklab, var(--paper) 90%, transparent)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-5 sm:px-6">
        {/* The mark alone. It already says the name; the wordmark said it twice. */}
        <Link href="/" className="tap-sq inline-flex shrink-0 items-center" aria-label="Dhvani, home">
          <Logo height={34} />
        </Link>

        <label className="ml-auto flex min-w-0 max-w-[14rem] flex-1 items-center gap-2 sm:max-w-[11rem]">
          <span className="sr-only">Master volume</span>
          <InkSlider value={master} onChange={setMaster} seed="master" label="Master volume" />
        </label>

        {playing > 0 && (
          <button
            type="button"
            onClick={clear}
            className="tap hand inline-flex shrink-0 items-center text-sm underline-offset-4 hover:underline"
            style={{ color: "var(--ink-soft)" }}
            aria-label={`Stop all, ${playing} playing`}
          >
            stop
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap-sq inline-flex shrink-0 items-center justify-center"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="settings-menu"
          aria-label="Paper, timer, lite mode and credits"
        >
          <svg viewBox="0 0 28 22" className="h-6 w-7 overflow-visible" aria-hidden>
            {[5, 11, 17].map((y, i) => (
              <path
                key={y}
                d={`M 3 ${y} C 10 ${y - 1.6 + i}, 18 ${y + 1.4 - i}, 25 ${y}`}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={2.2}
                strokeLinecap="round"
                opacity={open ? 1 : 0.7}
              />
            ))}
          </svg>
        </button>

        {open && <Menu onClose={close} />}
      </div>
    </header>
  );
}

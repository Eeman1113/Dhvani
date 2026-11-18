"use client";

import { useEffect, useRef } from "react";
import { RoughBorder } from "@/components/Rough";
import { dismissOffer, setTier, useMeasuredFps, usePerfOffer } from "@/lib/perf";

/**
 * The offer to switch to lite mode.
 *
 * Shown only after actually measuring dropped frames on this machine, never
 * from a user-agent guess. It says what was measured, because "your computer
 * is slow" is both rude and unfalsifiable, while "about 14 frames a second"
 * is a fact the reader can check against what they are looking at.
 *
 * It is a real modal: focus moves into it, Escape declines, and focus returns.
 */
export function PerfOffer() {
  const open = usePerfOffer();
  const fps = useMeasuredFps();
  const ref = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    yesRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissOffer();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep focus inside while it is open.
      const f = ref.current?.querySelectorAll<HTMLElement>("button");
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
      style={{ background: "color-mix(in oklab, var(--ink) 22%, transparent)" }}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="perf-title"
        aria-describedby="perf-body"
        className="relative w-full max-w-md rounded-[20px] px-5 py-5"
        style={{ background: "var(--paper-2)", boxShadow: "0 18px 50px -20px rgba(0,0,0,0.45)" }}
      >
        <RoughBorder seedKey="perf-offer" radius={20} stroke="var(--ink)" strokeWidth={2.2} opacity={0.65} />

        <div className="relative z-10">
          <h2 id="perf-title" className="hand text-xl" style={{ color: "var(--ink)" }}>
            This is drawing slowly here
          </h2>

          <p id="perf-body" className="mt-2 text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {fps ? `Frames are landing at about ${fps} a second. ` : ""}
There is a <strong style={{ color: "var(--ink)" }}>lite mode</strong>{" "}
            that draws far less. It keeps{" "}
            <strong style={{ color: "var(--ink)" }}>every sound and both music modes</strong>,
            exactly as they are, and it is nothing to do with the paper
            colour. Only the moving background, the particles and the
            redrawn lines go away.
          </p>
          <p className="mt-2 text-[0.8rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            On a machine this busy the drawing can interrupt the music, so
            lite mode usually sounds better too. You can switch back at any
            time from the menu.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              ref={yesRef}
              type="button"
              onClick={() => setTier("lite")}
              className="tap relative px-4 transition-transform active:scale-95"
            >
              <RoughBorder seedKey="perf-yes" radius={13} stroke="var(--accent)" strokeWidth={2.4} />
              <span className="hand relative z-10 text-base" style={{ color: "var(--ink)" }}>
                yes, use lite mode
              </span>
            </button>

            <button
              type="button"
              onClick={dismissOffer}
              className="tap relative px-4 transition-transform active:scale-95"
            >
              <RoughBorder seedKey="perf-no" radius={13} stroke="var(--ink)" strokeWidth={1.5} opacity={0.45} />
              <span className="hand relative z-10 text-base" style={{ color: "var(--ink-soft)" }}>
                no, keep drawing everything
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

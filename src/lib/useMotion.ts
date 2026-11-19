"use client";

import { useEffect, useRef } from "react";
import { subscribeFrame, type Levels } from "@/audio/engine";
import { getTier } from "./perf";

/**
 * Audio-reactive motion, applied straight to the DOM.
 *
 * Deliberately not React state. At sixty frames a second a setState per moving
 * element would re-render the tree sixty times a second forever, and "forever"
 * here means a laptop left open overnight. These write `transform` on a ref and
 * nothing above them ever knows.
 */

type Band = "bass" | "mid" | "air" | "rms";

/**
 * Nothing moves while a finger is down.
 *
 * Safari on iOS cancels a tap if the element under the finger shifts between
 * touchstart and touchend, and every card here is continuously lifting,
 * tilting and scaling with the music. A playing card moves the most, which is
 * why turning one off was the least reliable thing in the app and why it felt
 * random rather than broken: whether the tap registered depended on what the
 * bass was doing at that moment.
 *
 * One flag, set on the window, read by every motion loop. A tap lasts a
 * couple of hundred milliseconds and nobody notices the page holding still
 * for it; everybody notices a button that does not respond.
 */
let pointerHeld = false;

if (typeof window !== "undefined") {
  const down = () => {
    pointerHeld = true;
  };
  const up = () => {
    pointerHeld = false;
  };
  window.addEventListener("pointerdown", down, { passive: true, capture: true });
  window.addEventListener("pointerup", up, { passive: true, capture: true });
  window.addEventListener("pointercancel", up, { passive: true, capture: true });
  // A pointerup that lands outside the window never fires, so this is the
  // backstop that stops the page freezing for good.
  window.addEventListener("blur", up);
}

export type MotionOpts = {
  /** Only react while the sound this belongs to is actually playing. */
  active?: boolean;
  band?: Band;
  /** How far it moves. */
  lift?: number;
  scale?: number;
  tilt?: number;
  /** Spring stiffness and damping. Lower stiffness reads as heavier. */
  stiffness?: number;
  damping?: number;
  /** Extra kick on a transient. */
  punch?: number;
  /** Idle sway even in silence, so nothing is ever frozen. */
  idle?: number;
  /** Staggers elements so a row does not move as one block. */
  phase?: number;
};

export function useMotion<T extends SVGElement | HTMLElement>(opts: MotionOpts = {}) {
  const ref = useRef<T>(null);
  const o = useRef(opts);
  // Written after commit, not during render. A render that React throws away
  // must not leave its props behind in a ref the frame loop is reading.
  useEffect(() => {
    o.current = opts;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Measured: writing transforms on all 98 elements costs 0.032 ms a
    // frame, which is nothing, so cutting it outright in lite bought nothing
    // either. What it does buy is avoiding a *scale* change, which forces a
    // layer to re-raster on software compositing where a plain translate
    // does not. So lite keeps the motion for cards that are actually
    // playing, and keeps it to a translate.
    const lite = getTier() === "lite";

    let value = 0;
    let velocity = 0;
    let t = 0;

    const step = (l: Levels, dt: number) => {
      // Hold still while something is being tapped or dragged.
      if (pointerHeld) return;
      const c = o.current;
      t += dt;
      const band = c.band ?? "rms";
      const raw = c.active === false ? 0 : l[band] + l.hit * (c.punch ?? 0.5);

      // Critically-ish damped spring. The overshoot is the point: things should
      // land a little past where they were going and settle back.
      const k = c.stiffness ?? 90;
      const d = c.damping ?? 11;
      const a = (raw - value) * k - velocity * d;
      velocity += a * dt;
      value += velocity * dt;

      const phase = c.phase ?? 0;
      const idleAmt = c.idle ?? 1;
      const sway = Math.sin(t * 0.9 + phase) * idleAmt;
      const sway2 = Math.cos(t * 0.61 + phase * 1.7) * idleAmt;

      if (lite) {
        if (c.active === false) {
          if (el.style.transform) el.style.transform = "";
          return;
        }
        const lift = (c.lift ?? 6) * value;
        el.style.transform = `translate3d(0, ${(-lift).toFixed(2)}px, 0)`;
        return;
      }

      const lift = (c.lift ?? 6) * value + sway * 1.6;
      const scale = 1 + (c.scale ?? 0.08) * value + sway2 * 0.004;
      const tilt = (c.tilt ?? 2) * value * Math.sin(t * 1.7 + phase) + sway2 * 0.7;

      el.style.transform = `translate3d(0, ${(-lift).toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
    };

    return subscribeFrame(step);
  }, []);

  return ref;
}

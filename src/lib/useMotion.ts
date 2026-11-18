"use client";

import { useEffect, useRef } from "react";
import { subscribeFrame, type Levels } from "@/audio/engine";

/**
 * Audio-reactive motion, applied straight to the DOM.
 *
 * Deliberately not React state. At sixty frames a second a setState per moving
 * element would re-render the tree sixty times a second forever, and "forever"
 * here means a laptop left open overnight. These write `transform` on a ref and
 * nothing above them ever knows.
 */

type Band = "bass" | "mid" | "air" | "rms";

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
  o.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let value = 0;
    let velocity = 0;
    let t = 0;

    const step = (l: Levels, dt: number) => {
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

      const lift = (c.lift ?? 6) * value + sway * 1.6;
      const scale = 1 + (c.scale ?? 0.08) * value + sway2 * 0.004;
      const tilt = (c.tilt ?? 2) * value * Math.sin(t * 1.7 + phase) + sway2 * 0.7;

      el.style.transform = `translate3d(0, ${-lift.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
    };

    return subscribeFrame(step);
  }, []);

  return ref;
}

/** Writes a CSS custom property instead of a transform, for driving keyframe speeds. */
export function useLevelVar<T extends HTMLElement | SVGElement>(
  prop: string,
  map: (l: Levels) => string,
  active = true,
) {
  const ref = useRef<T>(null);
  const fn = useRef(map);
  fn.current = map;
  const on = useRef(active);
  on.current = active;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = "";
    return subscribeFrame((l) => {
      if (!on.current) return;
      const v = fn.current(l);
      if (v !== last) {
        el.style.setProperty(prop, v);
        last = v;
      }
    });
  }, [prop]);

  return ref;
}

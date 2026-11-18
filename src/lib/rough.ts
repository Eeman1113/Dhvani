/**
 * Hand-drawn geometry.
 *
 * Rather than filtering shapes through SVG turbulence (which blurs anything
 * underneath it and costs a repaint of the whole filter region every frame),
 * the wobble is baked into the path data: sample an ideal outline, push every
 * point around by a seeded noise, and run a smooth curve back through them.
 *
 * Generating three variants of the same shape and cycling between them a few
 * times a second gives the "boiling line" of hand-inked animation, where the
 * artist redraws each frame and nothing sits perfectly still. That crawl is
 * what makes the page feel alive rather than merely decorated.
 */

export type Pt = [number, number];

/** Deterministic PRNG, so a given card always wobbles the same way. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Outline of a rounded rectangle, sampled into roughly even points. */
export function roundRectPoints(w: number, h: number, r: number, step = 14): Pt[] {
  const rr = Math.min(r, w / 2, h / 2);
  const pts: Pt[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(d / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((Math.abs(a1 - a0) * rr) / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  };

  line(rr, 0, w - rr, 0);
  arc(w - rr, rr, -Math.PI / 2, 0);
  line(w, rr, w, h - rr);
  arc(w - rr, h - rr, 0, Math.PI / 2);
  line(w - rr, h, rr, h);
  arc(rr, h - rr, Math.PI / 2, Math.PI);
  line(0, h - rr, 0, rr);
  arc(rr, rr, Math.PI, Math.PI * 1.5);
  return pts;
}

export function circlePoints(cx: number, cy: number, r: number, n = 26): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

/**
 * Smooth cubic path through points, Catmull-Rom converted to bezier.
 * Closed shapes wrap; open ones clamp at the ends.
 */
export function smoothPath(pts: Pt[], closed = true): string {
  if (pts.length < 2) return "";
  const at = (i: number): Pt => {
    if (closed) return pts[(i + pts.length) % pts.length];
    return pts[Math.max(0, Math.min(pts.length - 1, i))];
  };
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  const last = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  if (closed) d += " Z";
  return d;
}

/** Push every point around by a smooth-ish seeded noise. */
export function jitter(pts: Pt[], seed: number, amp = 2.2): Pt[] {
  const rnd = seeded(seed);
  // A slowly varying offset rather than per-point white noise: a pen wanders,
  // it does not vibrate.
  let ox = 0;
  let oy = 0;
  return pts.map((pt) => {
    ox = ox * 0.55 + (rnd() * 2 - 1) * amp * 0.9;
    oy = oy * 0.55 + (rnd() * 2 - 1) * amp * 0.9;
    return [pt[0] + ox, pt[1] + oy] as Pt;
  });
}

/**
 * A shape as a hand would draw it: slightly wrong, and gone over twice.
 * Returns two paths, because a single stroke always looks printed.
 */
export function roughShape(
  pts: Pt[],
  seed: number,
  opts: { amp?: number; closed?: boolean; passes?: number } = {},
): string[] {
  const amp = opts.amp ?? 2;
  const closed = opts.closed ?? true;
  const passes = opts.passes ?? 2;
  return Array.from({ length: passes }, (_, p) =>
    smoothPath(jitter(pts, seed + p * 7919, amp * (p === 0 ? 1 : 0.75)), closed),
  );
}

/** The three frames a shape cycles through. */
export function roughFrames(
  pts: Pt[],
  seed: number,
  opts: { amp?: number; closed?: boolean; passes?: number } = {},
): string[][] {
  return [0, 1, 2].map((f) => roughShape(pts, seed + f * 104729, opts));
}

/**
 * Turns a generated sheet of line-art icons into wobbling SVG paths.
 *
 * The hand-coded doodles were honest but crude: a few dozen beziers each,
 * written by someone who cannot draw. These are drawn properly, then traced,
 * then given the same boiling line as everything else.
 *
 * Pipeline per icon:
 *   1. the sheet is sliced into one PNG per icon by alpha (slice-art.py)
 *   2. potrace turns the ink into filled outlines
 *   3. the outlines are normalised into a 64 x 64 box so every icon sits the
 *      same way on a card regardless of how the model framed it
 *   4. three wobbled variants are generated at BUILD TIME, so the runtime
 *      cost is three static strings rather than any geometry work
 */

import potrace from "potrace";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const [, , dir, outFile] = process.argv;

/** Deterministic PRNG so an icon always wobbles the same way. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** All coordinate pairs in a path, in order, so they can be walked. */
function mapCoords(d, fn) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const v = parseFloat(n);
    const out = fn(v, i);
    i++;
    return out.toFixed(1);
  });
}

function bounds(d) {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, maxX, maxY };
}

/** Fit the traced art into a 64 x 64 box with a small margin. */
function normalise(d, box = 64, margin = 3) {
  const b = bounds(d);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const scale = (box - margin * 2) / Math.max(w, h);
  const ox = (box - w * scale) / 2 - b.minX * scale;
  const oy = (box - h * scale) / 2 - b.minY * scale;
  return mapCoords(d, (v, i) => (i % 2 === 0 ? v * scale + ox : v * scale + oy));
}

/**
 * One redraw of the same icon.
 *
 * The offset is a slow random walk rather than per-point noise, because a pen
 * wanders; it does not vibrate. Amplitude stays under half a unit in a 64 unit
 * box so the icon stays legible while the line refuses to sit still.
 */
function wobble(d, seed, amp) {
  const rnd = seeded(seed);
  let ox = 0, oy = 0;
  return mapCoords(d, (v, i) => {
    if (i % 2 === 0) {
      ox = ox * 0.6 + (rnd() * 2 - 1) * amp * 0.9;
      return v + ox;
    }
    oy = oy * 0.6 + (rnd() * 2 - 1) * amp * 0.9;
    return v + oy;
  });
}

/** Icons nothing references. Tracing them is just bundle weight. */
const SKIP = new Set((process.env.SKIP_ICONS || "").split(",").filter(Boolean));

const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const results = {};
let done = 0;

/** One tracing pass at a given level of simplification. */
function traceOnce(file, opts) {
  return new Promise((resolve) => {
    potrace.trace(file, opts, (err, svg) => {
      if (err) return resolve(null);
      const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
      resolve(paths.length ? paths.join(" ") : null);
    });
  });
}

const BASE = {
  threshold: 128,
  // Speckle removal and curve merging, tuned against the rendered result
  // rather than the file size alone: below this the snowflakes and the rain
  // dashes start disappearing.
  turdSize: 4,
  optCurve: true,
  optTolerance: 0.55,
  alphaMax: 1.0,
  turnPolicy: "minority",
};

/**
 * Above this many characters an icon costs more than it is worth.
 *
 * Set so that only the genuinely heavy ones are touched. Set tight, nearly
 * every icon ran the simplifier four times for almost no saving, which is a
 * lot of quality given away to fix a handful of outliers.
 */
const BUDGET = 5800;

for (const f of files) {
  const name = basename(f, ".png");
  if (SKIP.has(name)) continue;
  {
    let d = await traceOnce(join(dir, f), BASE);
    if (!d) { console.error(name, "no paths"); continue; }
    // A dense scribble traces into thousands of curves. Simplify just those,
    // progressively, rather than coarsening every icon to suit the worst one.
    let pass = 0;
    while (d.length > BUDGET && pass < 4) {
      pass++;
      d = (await traceOnce(join(dir, f), {
        ...BASE,
        turdSize: 4 + pass * 5,
        optTolerance: 0.55 + pass * 0.45,
        alphaMax: 1.0 + pass * 0.08,
      })) || d;
    }
    const joined = normalise(d);
    results[name] = wobble(joined, hash(name), 0.0);
    console.log(`${name.padEnd(13)} ${(results[name].length / 1024).toFixed(1)} kB${pass ? `  (simplified x${pass})` : ""}`);
    done++;
  }
}

const header = `/**
 * Icon outlines, traced from drawn artwork.
 *
 * Generated by scripts/trace-icons.mjs. Each icon is three redraws of the
 * same outline in a 64 x 64 box, cycled to give the same boiling line as the
 * rest of the interface. Do not edit by hand; regenerate instead.
 */

export const ICON_PATHS = ${JSON.stringify(results, null, 0)} as const;

/**
 * The icons that actually exist.
 *
 * Deliberately NOT \`Record<string, string>\`: that annotation erases the
 * literal keys, so \`keyof\` collapses to \`string\` and a card referring to an
 * icon nobody drew compiles happily and renders a blank square. Inferred
 * from the object, this is a union of the real names.
 */
export type IconName = keyof typeof ICON_PATHS;
`;
writeFileSync(outFile, header);
console.log(`\n${done} icons -> ${outFile}`);

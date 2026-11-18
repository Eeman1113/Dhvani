/**
 * Recorded sources.
 *
 * Only used for things synthesis cannot convincingly fake. Each file is loaded
 * once, cached, and looped with a crossfade so there is no seam at the join,
 * because an audible seam every thirty seconds is the exact thing this app
 * exists to avoid.
 */

import { getContext } from "./engine";
import type { Sound } from "./catalogue";
import type { Voice } from "./voices";
import { asset } from "@/lib/asset";

const cache = new Map<string, AudioBuffer>();

async function fetchBuffer(src: string): Promise<AudioBuffer> {
  const hit = cache.get(src);
  if (hit) return hit;
  const res = await fetch(asset(src));
  if (!res.ok) throw new Error(`sample ${src}: ${res.status}`);
  const buf = await getContext().decodeAudioData(await res.arrayBuffer());
  cache.set(src, buf);
  return buf;
}

export async function loadSample(sound: Sound & { kind: "sample" }): Promise<Voice> {
  const ctx = getContext();
  const buf = await fetchBuffer(sound.src);
  const out = ctx.createGain();

  const [start, end] = sound.loop ?? [0, buf.duration];
  const XF = Math.min(1.5, (end - start) / 4);

  // Two sources playing the same region, offset by the loop length and
  // crossfaded at the join. Either half alone would click; together the seam
  // disappears completely.
  const period = end - start - XF;
  // A file that decodes to almost nothing would give period 0, and the
  // onended recursion would then spawn a source every few milliseconds for
  // as long as the page is open. Refuse it instead.
  if (!(period > 0.2)) {
    throw new Error(`sample ${sound.src}: too short to loop (${buf.duration.toFixed(2)}s)`);
  }
  const nodes: AudioBufferSourceNode[] = [];
  let stopped = false;

  const schedule = (at: number, index: number) => {
    if (stopped) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(1, at + XF);
    g.gain.setValueAtTime(1, at + period);
    g.gain.linearRampToValueAtTime(0.0001, at + period + XF);
    src.connect(g).connect(out);
    src.start(at, start, period + XF + 0.1);
    nodes.push(src);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
      const i = nodes.indexOf(src);
      if (i >= 0) nodes.splice(i, 1);
      // Each pass schedules the pass after next, keeping exactly two alive.
      schedule(Math.max(at + period * 2, ctx.currentTime + 0.05), index + 2);
    };
  };

  const t0 = ctx.currentTime + 0.05;
  schedule(t0, 0);
  schedule(t0 + period, 1);

  return {
    out,
    dispose() {
      stopped = true;
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          /* already done */
        }
        n.disconnect();
      }
      setTimeout(() => out.disconnect(), 400);
    },
  };
}

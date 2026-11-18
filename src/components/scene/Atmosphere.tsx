"use client";

import { useEffect, useRef } from "react";
import { subscribeFrame, type Levels } from "@/audio/engine";
import { signals } from "@/lib/signals";
import { Particles } from "./Particles";
import { asset } from "@/lib/asset";

/**
 * The place you have assembled.
 *
 * Six parallax layers of painted art, each one listening to a different part
 * of the mix. The whole thing is driven from a single frame callback that
 * writes transforms and opacities straight onto refs; no layer is a React
 * component that re-renders, because this runs for hours.
 *
 * The depth stack, back to front:
 *
 *   sky wash      tints with the dominant weather
 *   mountains     rise into view as the mix gets more outdoor
 *   mist          thickens with rain and night
 *   clouds        drift, and the wind decides how fast
 *   enso          an ink circle that breathes behind everything
 *   [particles]   rain, snow, petals, embers, fireflies, dust
 *   light         a warm bloom from the fire, a cold one from the moon
 *   birds         cross when there is a forest to cross
 *   vignette      closes the edges of the paper
 */

type LayerRef = { el: HTMLElement | null };

const CLOUDS = [
  { src: asset("/art/cloud-1.webp"), top: "6%", w: 340, depth: 0.55, speed: 7 },
  { src: asset("/art/cloud-2.webp"), top: "20%", w: 420, depth: 0.35, speed: 11 },
  { src: asset("/art/cloud-3.webp"), top: "52%", w: 380, depth: 0.22, speed: 15 },
  { src: asset("/art/cloud-4.webp"), top: "72%", w: 300, depth: 0.42, speed: 9 },
  { src: asset("/art/cloud-2.webp"), top: "38%", w: 260, depth: 0.7, speed: 5 },
];

const MISTS = [
  { src: asset("/art/mist-1.webp"), top: "28%", speed: 26, depth: 0.3 },
  { src: asset("/art/mist-3.webp"), top: "58%", speed: 18, depth: 0.5 },
  { src: asset("/art/mist-4.webp"), top: "80%", speed: 34, depth: 0.2 },
];

export function Atmosphere() {
  const root = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const mountains = useRef<HTMLDivElement>(null);
  const enso = useRef<HTMLDivElement>(null);
  const fireGlow = useRef<HTMLDivElement>(null);
  const moon = useRef<HTMLDivElement>(null);
  const water = useRef<HTMLDivElement>(null);
  const clouds = useRef<LayerRef[]>(CLOUDS.map(() => ({ el: null })));
  const mists = useRef<LayerRef[]>(MISTS.map(() => ({ el: null })));
  const birds = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pointer parallax. Tiny on purpose; the aim is that the page has depth,
    // not that it follows your cursor around.
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let scroll = 0;
    const onScroll = () => {
      scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const drift = CLOUDS.map(() => Math.random() * 2000);
    const mistDrift = MISTS.map(() => Math.random() * 2000);
    let birdTimer = 12;
    let birdFlight = -1;

    const step = (levels: Levels, dt: number) => {
      const s = signals;
      px += (tx - px) * Math.min(1, dt * 2.5);
      py += (ty - py) * Math.min(1, dt * 2.5);

      const vw = window.innerWidth;
      const breath = levels.rms;

      /* --- sky ----------------------------------------------------- */
      if (sky.current) {
        // The paper takes on the colour of whatever is loudest. Rain cools it,
        // fire warms it from below, night drops it darker.
        const warm = s.fire;
        const cold = Math.max(s.rain, s.snow) * 0.8;
        const dark = s.night;
        sky.current.style.opacity = String(
          0.1 + Math.max(warm, cold, dark) * 0.5 + s.activity * 0.08,
        );
        sky.current.style.background =
          `radial-gradient(120% 90% at 50% 112%, rgba(255,176,94,${(warm * 0.5).toFixed(3)}) 0%, rgba(255,176,94,0) 60%),` +
          `radial-gradient(100% 70% at 50% -12%, rgba(104,134,176,${(cold * 0.45).toFixed(3)}) 0%, rgba(104,134,176,0) 70%),` +
          `linear-gradient(180deg, rgba(26,28,48,${(dark * 0.42).toFixed(3)}) 0%, rgba(26,28,48,${(dark * 0.1).toFixed(3)}) 55%, rgba(26,28,48,${(dark * 0.3).toFixed(3)}) 100%)`;
      }

      /* --- mountains ----------------------------------------------- */
      if (mountains.current) {
        const show = Math.max(s.forest * 0.9, s.wind * 0.8, s.zen * 0.7, s.snow) * (1 - s.indoors * 0.7);
        mountains.current.style.opacity = (show * 0.26).toFixed(3);
        mountains.current.style.transform =
          `translate3d(${(-px * 8).toFixed(1)}px, ${(scroll * 0.03 - breath * 3).toFixed(1)}px, 0)`;
      }

      /* --- mist ----------------------------------------------------- */
      MISTS.forEach((m, i) => {
        const el = mists.current[i].el;
        if (!el) return;
        const windSpeed = m.speed * (0.35 + s.wind * 2.4);
        if (!reduced) mistDrift[i] += windSpeed * dt;
        const span = vw + 900;
        const x = -450 + (((mistDrift[i] % span) + span) % span);
        const show = Math.max(s.rain * 0.7, s.night * 0.5, s.water * 0.45, s.snow * 0.8);
        el.style.opacity = (show * 0.22).toFixed(3);
        el.style.transform =
          `translate3d(${(x - vw / 2 - px * 14 * m.depth).toFixed(1)}px, ${(scroll * 0.05 * m.depth - py * 8 * m.depth).toFixed(1)}px, 0)`;
      });

      /* --- clouds --------------------------------------------------- */
      CLOUDS.forEach((c, i) => {
        const el = clouds.current[i].el;
        if (!el) return;
        // Base drift is always there, so the sky is alive in silence too.
        const speed = c.speed * (0.3 + s.wind * 3.2 + levels.mid * 0.5 * s.wind);
        if (!reduced) drift[i] += speed * dt;
        const span = vw + c.w + 200;
        const x = -c.w - 100 + (((drift[i] % span) + span) % span);
        const bob = Math.sin(performance.now() / 2600 + i * 2.1) * 7 * (0.4 + breath);
        const par = c.depth;
        el.style.transform =
          `translate3d(${(x - px * 26 * par).toFixed(1)}px, ${(bob + scroll * 0.08 * par - py * 16 * par).toFixed(1)}px, 0) scale(${(1 + breath * 0.02 * par).toFixed(4)})`;
        // Clouds hide when you are indoors and gather when it rains.
        // Kept low deliberately. The sky is scenery behind a working surface,
        // and the moment a cloud competes with a label the page has failed.
        // Scaled by depth, so the near clouds read nearer. Five layers at one
        // opacity is a sticker sheet; five at different ones is a sky.
        el.style.opacity = (
          (0.13 + s.rain * 0.2 + s.wind * 0.1 + s.activity * 0.06) *
          (1.25 - par * 0.75) *
          (1 - s.indoors * 0.8) *
          (1 - s.night * 0.3)
        ).toFixed(3);
      });

      /* --- enso ----------------------------------------------------- */
      if (enso.current) {
        const show = Math.max(s.zen, s.activity * 0.22);
        enso.current.style.opacity = (show * 0.1).toFixed(3);
        enso.current.style.transform =
          `translate3d(-50%, calc(-50% + ${(scroll * 0.12).toFixed(1)}px), 0) rotate(${(performance.now() / 900).toFixed(2)}deg) scale(${(1 + breath * 0.06 + s.zen * 0.1).toFixed(4)})`;
      }

      /* --- light ---------------------------------------------------- */
      if (fireGlow.current) {
        // The flicker lives in the air band, where the crackle is.
        const flick = 0.72 + levels.air * 0.5 + levels.hit * 0.3;
        fireGlow.current.style.opacity = (s.fire * 0.55 * flick).toFixed(3);
        fireGlow.current.style.transform =
          `translate3d(-50%, 0, 0) scale(${(1 + levels.bass * 0.1 + levels.air * 0.06).toFixed(4)})`;
      }
      if (moon.current) {
        moon.current.style.opacity = (s.night * 0.45).toFixed(3);
        moon.current.style.transform =
          `translate3d(${(-px * 6).toFixed(1)}px, ${(scroll * 0.02 - s.night * 18 - breath * 2).toFixed(1)}px, 0) scale(${(1 + breath * 0.03).toFixed(4)})`;
      }

      /* --- water ---------------------------------------------------- */
      if (water.current) {
        water.current.style.opacity = (s.water * 0.3).toFixed(3);
        // The horizon swells on the bass, which is where the sets are.
        water.current.style.transform =
          `translate3d(0, ${(-levels.bass * 16 * s.water).toFixed(1)}px, 0) scaleY(${(1 + levels.bass * 0.25 * s.water).toFixed(4)})`;
      }

      /* --- birds ---------------------------------------------------- */
      if (birds.current) {
        if (birdFlight < 0) {
          birdTimer -= dt * (0.2 + s.forest * 2.4);
          if (birdTimer <= 0 && s.forest > 0.25) {
            birdFlight = 0;
            birdTimer = 14 + Math.random() * 26;
          }
          birds.current.style.opacity = "0";
        } else {
          birdFlight += dt / 13;
          if (birdFlight > 1) {
            birdFlight = -1;
          } else {
            const t = birdFlight;
            const x = -180 + t * (vw + 360);
            const y = Math.sin(t * Math.PI * 1.6) * 40 - t * 30;
            birds.current.style.opacity = String(
              Math.min(1, t * 6) * Math.min(1, (1 - t) * 6) * s.forest * 0.85,
            );
            birds.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          }
        }
      }
    };

    const unsub = subscribeFrame(step);
    return () => {
      unsub();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, filter: "var(--art-grade, none)" }} aria-hidden>
      <div ref={sky} className="absolute inset-0" style={{ transition: "none" }} />

      {/* mountains, sitting on the bottom edge */}
      <div ref={mountains} className="absolute bottom-0 left-0 w-full" style={{ opacity: 0 }}>
        <img src={asset("/art/mountains.webp")} alt="" className="h-auto w-full min-w-[900px] object-cover" draggable={false} />
      </div>

      {/* a plain band of water under the mountains */}
      <div
        ref={water}
        className="absolute bottom-0 left-0 h-[22vh] w-full origin-bottom"
        style={{
          opacity: 0,
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent) 24%, transparent) 0%, color-mix(in oklab, var(--accent) 8%, transparent) 60%, transparent 100%)",
        }}
      />

      {MISTS.map((m, i) => (
        <div
          key={`mist-${i}`}
          ref={(el) => {
            mists.current[i].el = el;
          }}
          className="absolute left-1/2 w-[140vw] min-w-[1100px]"
          style={{ top: m.top, opacity: 0 }}
        >
          <img src={m.src} alt="" className="h-auto w-full" draggable={false} />
        </div>
      ))}

      {CLOUDS.map((c, i) => (
        <div
          key={`cloud-${i}`}
          ref={(el) => {
            clouds.current[i].el = el;
          }}
          className="absolute left-0"
          style={{ top: c.top, width: c.w, opacity: 0 }}
        >
          <img src={c.src} alt="" className="h-auto w-full" draggable={false} />
        </div>
      ))}

      <div
        ref={enso}
        className="absolute left-1/2 top-[34%] w-[min(62vw,620px)]"
        style={{ opacity: 0 }}
      >
        <img src={asset("/art/enso.webp")} alt="" className="h-auto w-full" draggable={false} />
      </div>

      <div ref={moon} className="absolute right-[8%] top-[6%] w-[min(22vw,190px)]" style={{ opacity: 0 }}>
        <img src={asset("/art/moon.webp")} alt="" className="h-auto w-full" draggable={false} />
      </div>

      <div
        ref={fireGlow}
        className="absolute bottom-[-24vh] left-1/2 h-[64vh] w-[min(150vw,1300px)] origin-bottom"
        style={{ opacity: 0 }}
      >
        <img src={asset("/art/glow.webp")} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>

      <div ref={birds} className="absolute left-0 top-[16%]" style={{ opacity: 0 }}>
        <img src={asset("/art/bird-far.webp")} alt="" className="inline-block w-9" draggable={false} />
        <img src={asset("/art/bird-far.webp")} alt="" className="ml-7 inline-block w-6 translate-y-5" draggable={false} />
        <img src={asset("/art/bird-far.webp")} alt="" className="ml-5 inline-block w-7 -translate-y-3" draggable={false} />
      </div>

      <Particles />

      {/* the edges of the sheet */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 3,
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 55%, color-mix(in oklab, var(--ink) 9%, transparent) 100%)",
        }}
      />
    </div>
  );
}

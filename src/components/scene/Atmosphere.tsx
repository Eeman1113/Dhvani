"use client";

/*
 * next/image is deliberately not used in this file.
 *
 * The build is a static export with image optimisation off, so next/image
 * would add a wrapper and a layout pass and change nothing about the bytes.
 * These are also decorative layers whose size is driven by CSS and whose
 * transforms are written every frame, which is exactly the case next/image
 * is worst at.
 */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import { subscribeFrame, type Levels } from "@/audio/engine";
import { signals, refreshSignals, stepSignals } from "@/lib/signals";
import { Particles } from "./Particles";
import { useLite } from "@/lib/perf";
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

/** A phone gets three clouds and two mist bands, not five and three. */
function layerBudget() {
  if (typeof window === "undefined") return { clouds: CLOUDS.length, mists: MISTS.length };
  const narrow = window.innerWidth < 640;
  return { clouds: narrow ? 3 : CLOUDS.length, mists: narrow ? 2 : MISTS.length };
}

export function Atmosphere() {
  const lite = useLite();
  if (lite) return <LiteAtmosphere />;
  return <FullAtmosphere />;
}

/**
 * The light sky.
 *
 * No images, no filter, no canvas, no parallax and nothing written per frame.
 * It is two CSS gradients whose colours are driven by the mix a few times a
 * second, which is enough to keep the page answering what you are playing:
 * fire still warms the paper from below, rain still cools it, night still
 * darkens it. That was always the point of the background. The clouds were
 * only ever the expensive way to say it.
 */
function LiteAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = "";
    let acc = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      acc += dt;
      // Four times a second. Colour does not need sixty.
      if (acc < 0.25) return;
      refreshSignals();
      stepSignals(acc);
      acc = 0;

      const s = signals;
      const warm = s.fire;
      const cold = Math.max(s.rain, s.snow) * 0.8;
      const dark = s.night;
      const next =
        `radial-gradient(130% 95% at 50% 112%, rgba(255,176,94,${(warm * 0.34).toFixed(2)}) 0%, rgba(255,176,94,0) 62%),` +
        `radial-gradient(110% 75% at 50% -12%, rgba(104,134,176,${(cold * 0.3).toFixed(2)}) 0%, rgba(104,134,176,0) 72%),` +
        `linear-gradient(180deg, rgba(26,28,48,${(dark * 0.3).toFixed(2)}) 0%, rgba(26,28,48,0) 55%, rgba(26,28,48,${(dark * 0.2).toFixed(2)}) 100%)`;
      if (next !== last && ref.current) {
        ref.current.style.background = next;
        last = next;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
      {/*
        Painted once and never touched again. Lite still needs somewhere for
        the page to sit: a warm pool of light where the paper curves, a cooler
        wash at the top, and the suggestion of a horizon low down. It is the
        same composition as the full scene, said in three gradients instead of
        six images, a filter and a canvas.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 55% at 50% 108%, color-mix(in oklab, var(--accent) 16%, transparent) 0%, transparent 70%)," +
            "radial-gradient(120% 70% at 50% -16%, color-mix(in oklab, var(--accent-2) 11%, transparent) 0%, transparent 72%)," +
            "linear-gradient(180deg, transparent 58%, color-mix(in oklab, var(--line) 30%, transparent) 86%, color-mix(in oklab, var(--line) 12%, transparent) 100%)",
        }}
      />
      <div ref={ref} className="absolute inset-0" style={{ transition: "background 600ms linear" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 58%, color-mix(in oklab, var(--ink) 8%, transparent) 100%)",
        }}
      />
    </div>
  );
}

function FullAtmosphere() {
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
      // Only a real hovering pointer drives the parallax. On a touch screen
      // the only pointermove events are drags, so following them makes the
      // whole background lurch every time you move a fader.
      if (e.pointerType !== "mouse") return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let viewportWidth = window.innerWidth;
    const onResize = () => {
      viewportWidth = window.innerWidth;
    };
    window.addEventListener("resize", onResize, { passive: true });

    let scroll = 0;
    const onScroll = () => {
      scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let budget = layerBudget();
    const onBudget = () => {
      budget = layerBudget();
    };
    window.addEventListener("resize", onBudget, { passive: true });

    const drift = CLOUDS.map(() => Math.random() * 2000);
    const mistDrift = MISTS.map(() => Math.random() * 2000);
    let birdTimer = 12;
    let birdFlight = -1;

    let refreshIn = 0;

    const step = (levels: Levels, dt: number) => {
      // The signal clock lives here rather than in the particle layer, because
      // the atmosphere always renders and the particles opt out under reduced
      // motion. Colour and light are not motion and should survive that.
      refreshIn -= dt;
      if (refreshIn <= 0) {
        refreshSignals();
        refreshIn = 0.4;
      }
      stepSignals(dt);

      const s = signals;
      px += (tx - px) * Math.min(1, dt * 2.5);
      py += (ty - py) * Math.min(1, dt * 2.5);

      const vw = viewportWidth;
      const breath = reduced ? 0 : levels.rms;
      if (reduced) {
        px = 0;
        py = 0;
      }

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
        // There is always a horizon. It just comes forward when the mix turns
        // outdoor, and recedes when you shut the window.
        const show = 0.42 + Math.max(s.forest * 0.9, s.wind * 0.8, s.zen * 0.7, s.snow) * 0.58;
        mountains.current.style.opacity = (show * 0.3 * (1 - s.indoors * 0.6)).toFixed(3);
        mountains.current.style.transform =
          `translate3d(${(-px * 8).toFixed(1)}px, ${(scroll * 0.03 - breath * 3).toFixed(1)}px, 0)`;
      }

      /* --- mist ----------------------------------------------------- */
      MISTS.forEach((m, i) => {
        const el = mists.current[i].el;
        if (!el) return;
        if (i >= budget.mists) {
          el.style.opacity = "0";
          return;
        }
        const windSpeed = m.speed * (0.35 + s.wind * 2.4);
        if (!reduced) mistDrift[i] += windSpeed * dt;
        const span = vw + 900;
        const x = -450 + (((mistDrift[i] % span) + span) % span);
        const show = 0.3 + Math.max(s.rain * 0.7, s.night * 0.5, s.water * 0.45, s.snow * 0.8) * 0.7;
        el.style.opacity = (show * 0.2).toFixed(3);
        el.style.transform =
          `translate3d(${(x - vw / 2 - px * 14 * m.depth).toFixed(1)}px, ${(scroll * 0.05 * m.depth - py * 8 * m.depth).toFixed(1)}px, 0)`;
      });

      /* --- clouds --------------------------------------------------- */
      CLOUDS.forEach((c, i) => {
        const el = clouds.current[i].el;
        if (!el) return;
        if (i >= budget.clouds) {
          el.style.opacity = "0";
          return;
        }
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
          (0.4 + s.rain * 0.3 + s.wind * 0.14 + s.activity * 0.1) *
          (1.25 - par * 0.75) *
          (1 - s.indoors * 0.72) *
          (1 - s.night * 0.28)
        ).toFixed(3);
      });

      /* --- enso ----------------------------------------------------- */
      if (enso.current) {
        const show = Math.max(s.zen, s.activity * 0.22);
        enso.current.style.opacity = (0.05 + show * 0.1).toFixed(3);
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
        if (reduced) {
          birds.current.style.opacity = "0";
        } else if (birdFlight < 0) {
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
      window.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onBudget);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
      <div ref={sky} className="absolute inset-0" style={{ transition: "none" }} />

      {/*
        Only the painted layers are graded. They were all painted on white, so
        each paper needs its own grade or they sit on the page like stickers.
        The particles below are drawn in the theme's own ink and accent, so
        grading them a second time just turns white snow into grey grit.
      */}
      <div className="absolute inset-0" style={{ filter: "var(--art-grade, none)" }}>

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

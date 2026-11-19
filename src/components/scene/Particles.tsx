"use client";

import { useEffect, useRef } from "react";
import { subscribeFrame, type Levels } from "@/audio/engine";
import { signals } from "@/lib/signals";
import { asset } from "@/lib/asset";
import { useLite } from "@/lib/perf";

/**
 * Weather.
 *
 * One canvas for every kind of falling, rising or drifting thing, because a
 * few hundred DOM nodes animating independently is the fastest way to make a
 * page that has to run for six hours feel like it is dying. Canvas draws the
 * lot in a single pass.
 *
 * Nothing here is switched on by a boolean. Each kind of particle has a spawn
 * rate that is a function of the mix signals, so rain does not appear, it
 * *starts raining*, gets heavier as you push the fader, and stops when you
 * take it away. The transition is the feature.
 */

type Kind = "rain" | "snow" | "petal" | "ember" | "firefly" | "dust";

type P = {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rot: number;
  vrot: number;
  seed: number;
  sprite: number;
};

/**
 * Particle budget.
 *
 * A phone is doing all of this on a battery, behind a sticky header, under
 * eighty-odd boiling SVG borders, while synthesising audio. It gets a
 * smaller sky. The cut is by viewport width rather than by user agent so a
 * narrow desktop window gets the same relief.
 */
function particleBudget() {
  if (typeof window === "undefined") return 520;
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (w < 640) return cores <= 4 ? 110 : 170;
  if (w < 1024) return 300;
  return 520;
}

/** Sprites painted for this project. Loaded once, drawn thousands of times. */
const SPRITE_SRCS = [
  asset("/art/petal.webp"),
  asset("/art/leaf-green.webp"),
  asset("/art/leaf-maple.webp"),
  asset("/art/leaf-dry.webp"),
  asset("/art/blossom.webp"),
  asset("/art/seed-tuft.webp"),
];

export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const lite = useLite();

  useEffect(() => {
    // A full viewport canvas cleared and repainted every frame is the single
    // most expensive thing on the page without a GPU.
    if (lite) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sprites: (HTMLImageElement | null)[] = SPRITE_SRCS.map(() => null);
    SPRITE_SRCS.forEach((src, i) => {
      const img = new Image();
      img.onload = () => {
        sprites[i] = img;
      };
      // A missing sprite must not break the weather; petals simply do not fall.
      img.onerror = () => {};
      img.src = src;
    });

    let w = 0;
    let h = 0;
    let dpr = 1;
    let max = particleBudget();
    const resize = () => {
      max = particleBudget();
      // A phone's device pixel ratio is routinely 3. Rendering soft, blurry
      // particles at 3x costs nine times the fill rate and looks identical.
      dpr = Math.min(window.innerWidth < 640 ? 1.5 : 2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pool: P[] = [];
    const spawnDebt: Record<Kind, number> = {
      rain: 0, snow: 0, petal: 0, ember: 0, firefly: 0, dust: 0,
    };

    // Ink colours are read from the theme rather than hardcoded, so the
    // weather recolours itself when the paper changes.
    let ink = "#423a2e";
    let accent = "#bb9a63";
    let readThemeIn = 0;
    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue("--ink").trim() || ink;
      accent = cs.getPropertyValue("--accent").trim() || accent;
    };
    readTheme();

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (kind: Kind) => {
      if (pool.length >= max) return;
      const p: P = {
        kind, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
        size: 1, rot: 0, vrot: 0, seed: Math.random() * 1000, sprite: 0,
      };
      switch (kind) {
        case "rain":
          p.x = rnd(-0.15 * w, 1.15 * w);
          p.y = -20;
          p.vy = rnd(760, 1250);
          p.vx = 0;
          p.size = rnd(9, 24);
          p.maxLife = 6;
          break;
        case "snow":
          p.x = rnd(-0.1 * w, 1.1 * w);
          p.y = -14;
          p.vy = rnd(32, 85);
          p.vx = rnd(-16, 16);
          p.size = rnd(1.4, 4.2);
          p.maxLife = 40;
          break;
        case "petal":
          p.x = rnd(-0.1 * w, 1.1 * w);
          p.y = -40;
          p.vy = rnd(34, 78);
          p.vx = rnd(-22, 22);
          p.size = rnd(12, 30);
          p.rot = rnd(0, Math.PI * 2);
          p.vrot = rnd(-1.4, 1.4);
          p.sprite = Math.floor(Math.random() * SPRITE_SRCS.length);
          p.maxLife = 40;
          break;
        case "ember":
          // Embers come off the fire, which lives at the bottom of the page.
          p.x = w * 0.5 + rnd(-w * 0.34, w * 0.34);
          p.y = h + 10;
          p.vy = -rnd(45, 130);
          p.vx = rnd(-18, 18);
          p.size = rnd(1.1, 3);
          p.maxLife = rnd(3.5, 8);
          break;
        case "firefly":
          p.x = rnd(0, w);
          p.y = rnd(h * 0.25, h);
          p.vy = rnd(-9, 9);
          p.vx = rnd(-11, 11);
          p.size = rnd(1.6, 3.4);
          p.maxLife = rnd(8, 22);
          break;
        case "dust":
          p.x = rnd(0, w);
          p.y = rnd(0, h);
          p.vy = rnd(-5, 2);
          p.vx = rnd(-6, 6);
          p.size = rnd(0.7, 2);
          p.maxLife = rnd(14, 34);
          break;
      }
      pool.push(p);
    };

    const step = (levels: Levels, dt: number) => {
      // Only the drawing is gated on reduced motion. The signals themselves
      // are driven by the atmosphere, so colour and light still respond.
      if (reduced) return;
      readThemeIn -= dt;
      if (readThemeIn <= 0) {
        readTheme();
        readThemeIn = 1.0;
      }
      ctx.clearRect(0, 0, w, h);
      if (w === 0 || h === 0) return;

      const s = signals;
      // Wind pushes everything sideways. One number, shared, so rain and
      // petals and snow all lean the same way at the same moment.
      const gust =
        (s.wind * 230 + levels.mid * 60 * s.wind) *
        (0.55 + 0.45 * Math.sin(performance.now() / 4200));

      // Spawn rates, per second, as functions of the mix.
      // Spawn rates scale with the budget, so a small screen gets lighter
      // weather rather than the same weather that then hits the cap and
      // stutters as particles are refused.
      const k = max / 520;
      const rates: Record<Kind, number> = {
        rain: s.rain * s.rain * 260 * (1 - s.indoors * 0.45) * k,
        snow: s.snow * 70 * k,
        petal: Math.max(s.forest * 7, s.wind * 3.5) * (1 - s.indoors * 0.6) * k,
        ember: s.fire * 26 * k,
        firefly: s.night * 1.6 * k,
        dust: (s.indoors * 2.4 + s.activity * 0.8) * k,
      };

      for (const kind of Object.keys(rates) as Kind[]) {
        spawnDebt[kind] += rates[kind] * dt;
        let n = Math.floor(spawnDebt[kind]);
        spawnDebt[kind] -= n;
        while (n-- > 0) spawn(kind);
      }

      const now = performance.now() / 1000;

      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.life += dt;

        let drawn = true;
        switch (p.kind) {
          case "rain": {
            p.vx = gust;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.strokeStyle = accent;
            ctx.globalAlpha = 0.3 * Math.min(1, s.rain * 1.6);
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - (p.vx / p.vy) * p.size, p.y - p.size);
            ctx.stroke();
            break;
          }
          case "snow": {
            p.x += (p.vx + gust * 0.35) * dt + Math.sin(now * 1.1 + p.seed) * 11 * dt;
            p.y += p.vy * dt;
            ctx.globalAlpha = 0.75 * Math.min(1, s.snow * 1.8);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "petal": {
            p.x += (p.vx + gust * 0.5) * dt + Math.sin(now * 0.8 + p.seed) * 22 * dt;
            p.y += p.vy * dt;
            p.rot += p.vrot * dt;
            const img = sprites[p.sprite];
            if (img) {
              ctx.globalAlpha = 0.9;
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(p.rot);
              // Squash across the short axis as it turns, so it reads as a
              // flat thing tumbling rather than a sticker spinning.
              ctx.scale(Math.cos(now * 1.6 + p.seed) * 0.5 + 0.6, 1);
              const ar = img.height / img.width;
              ctx.drawImage(img, -p.size / 2, (-p.size * ar) / 2, p.size, p.size * ar);
              ctx.restore();
            } else {
              drawn = false;
            }
            break;
          }
          case "ember": {
            p.vy += 6 * dt; // they slow as they cool
            p.x += (p.vx + gust * 0.2) * dt + Math.sin(now * 2.4 + p.seed) * 18 * dt;
            p.y += p.vy * dt;
            const k = 1 - p.life / p.maxLife;
            // Embers flicker with the crackle, which is up in the air band.
            const flick = 0.55 + 0.45 * levels.air;
            ctx.globalAlpha = Math.max(0, k * k) * 0.85 * flick;
            ctx.fillStyle = "#ff9a4d";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "firefly": {
            p.vx += Math.sin(now * 0.7 + p.seed) * 9 * dt;
            p.vy += Math.cos(now * 0.55 + p.seed * 1.7) * 7 * dt;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const pulse = 0.5 + 0.5 * Math.sin(now * 1.6 + p.seed);
            const fade = Math.min(1, p.life / 1.5) * Math.min(1, (p.maxLife - p.life) / 1.5);
            ctx.globalAlpha = pulse * fade * 0.85;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
            g.addColorStop(0, "#fff6b0");
            g.addColorStop(1, "rgba(255,246,176,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "dust": {
            p.x += (p.vx + Math.sin(now * 0.3 + p.seed) * 5) * dt;
            p.y += p.vy * dt;
            const fade = Math.min(1, p.life / 3) * Math.min(1, (p.maxLife - p.life) / 3);
            ctx.globalAlpha = fade * 0.22 * s.indoors;
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
        }

        const off =
          p.y > h + 60 || p.y < -140 || p.x < -0.3 * w || p.x > 1.3 * w;
        if (!drawn || off || p.life > p.maxLife) pool.splice(i, 1);
      }

      ctx.globalAlpha = 1;
    };

    const unsub = subscribeFrame(step);
    return () => {
      unsub();
      ro.disconnect();
    };
  }, [lite]);

  if (lite) return null;

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: 2 }}
      aria-hidden
    />
  );
}

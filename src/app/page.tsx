"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Mixer } from "@/components/Mixer";
import { MusicDeck } from "@/components/MusicDeck";
import { Presets } from "@/components/Presets";
import { Atmosphere } from "@/components/scene/Atmosphere";
import { LogoDrawIn } from "@/components/Logo";
import { useDhvani } from "@/lib/store";

export default function Home() {
  // The mark is the page's largest single element; at 96 px it took a quarter
  // of the fold on a small phone before a word had been read.
  const narrow = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
  const logoHeight = narrow ? 68 : 96;
  const awake = useDhvani((s) => s.awake);
  const wake = useDhvani((s) => s.wake);
  // The draw-on animation must not run during hydration, and this says
  // "client only" without a second render pass to say it.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // The browser will not start an AudioContext without a gesture, so the first
  // click anywhere counts as one rather than making the user find a button.
  useEffect(() => {
    if (awake) return;
    const once = () => wake();
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
    return () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
  }, [awake, wake]);

  return (
    <>
      <Atmosphere />
      <div className="relative" style={{ zIndex: 10 }}>
        {/* 196 tab stops sit between the header and the footer. */}
        <a
          href="#mixer"
          className="hand sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2"
          style={{ background: "var(--paper-2)", color: "var(--ink)" }}
        >
          skip to the sounds
        </a>
        <TopBar />

        <main className="mx-auto max-w-6xl px-3 pb-24 pt-6 sm:px-6 sm:pt-8">
          <section className="mb-9 flex flex-col items-center text-center sm:mb-12">
            {mounted && <LogoDrawIn height={logoHeight} />}
            <h1 className="sr-only">Dhvani</h1>
            <p
              className="mt-4 max-w-xl text-pretty text-[0.9rem] leading-relaxed sm:mt-5 sm:text-[0.95rem]"
              style={{ color: "var(--ink-soft)" }}
            >
              <span className="deva" style={{ color: "var(--ink)" }}>
                ध्वनि
              </span>{" "}
              is the Sanskrit word for sound. Stack as many of these as you
              like, set the levels, and leave it running. Most of it is
              synthesised as you listen rather than played back, so most of it
              never loops, and the fourth hour sounds as alive as the first. The
              handful that are real recordings are marked 録 and credited.
            </p>
            {!awake && (
              <p className="hand mt-4 text-sm" style={{ color: "var(--accent-text)" }}>
                click anything to begin
              </p>
            )}
          </section>

          <div className="mb-12">
            <Presets />
          </div>

          <div className="mb-12">
            <MusicDeck />
          </div>

          <div id="mixer">
            <Mixer />
          </div>

          <footer
            className="mt-16 flex flex-col items-center gap-2 text-center text-[0.78rem] sm:mt-20"
            style={{ color: "var(--ink-soft)" }}
          >
            <p>
              Built to be left on.
            </p>
            <Link href="/credits" className="hand tap text-sm underline-offset-4 hover:underline">
              what it is made of, and who to thank
            </Link>
          </footer>
        </main>
      </div>
    </>
  );
}

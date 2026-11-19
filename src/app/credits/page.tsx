"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Atmosphere } from "@/components/scene/Atmosphere";
import { RoughBorder } from "@/components/Rough";
import { Logo } from "@/components/Logo";
import { CREDITS } from "@/audio/credits";
import { SOUNDS } from "@/audio/catalogue";

const synthCount = SOUNDS.filter((s) => s.kind === "synth").length;
const sampleCount = SOUNDS.filter((s) => s.kind === "sample").length;

function Section({
  id,
  title,
  jp,
  children,
}: {
  id: string;
  title: string;
  jp: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-24" aria-labelledby={`${id}-h`}>
      <header className="mb-4 flex items-baseline gap-2.5">
        <h2 id={`${id}-h`} className="hand text-2xl leading-none" style={{ color: "var(--ink)" }}>
          {title}
        </h2>
        <span className="jp text-base leading-none" style={{ color: "var(--accent-text)" }}>
          {jp}
        </span>
      </header>
      <div className="flex flex-col gap-4 text-[0.93rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        {children}
      </div>
    </section>
  );
}

function Card({ children, seed }: { children: React.ReactNode; seed: string }) {
  return (
    <div className="relative rounded-[18px] px-5 py-4" style={{ background: "var(--paper-2)" }}>
      <RoughBorder seedKey={seed} radius={18} stroke="var(--ink)" strokeWidth={1.6} opacity={0.4} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Term({ word, children }: { word: string; children: React.ReactNode }) {
  return (
    <p>
      <strong className="hand text-[1.08rem]" style={{ color: "var(--ink)" }}>
        {word}
      </strong>
      <span className="mx-2" style={{ color: "var(--accent-text)" }}>
        /
      </span>
      {children}
    </p>
  );
}

export default function Credits() {
  return (
    <>
      <Atmosphere />
      <div className="relative" style={{ zIndex: 10 }}>
        <TopBar />

        <main className="relative mx-auto max-w-3xl px-3 pb-24 pt-6 sm:px-6 sm:pt-10">
          {/*
            The atmosphere follows you onto this page, which is right, but this
            one is for reading. A soft sheet of the paper colour behind the
            column keeps the clouds from getting into the prose.
          */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bottom-0 -z-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--paper) 86%, transparent) 7%, color-mix(in oklab, var(--paper) 86%, transparent) 93%, transparent 100%)",
            }}
            aria-hidden
          />
          <header className="mb-10 flex flex-col items-center text-center sm:mb-14">
            <Logo height={62} />
            <h1 className="hand mt-5 text-3xl" style={{ color: "var(--ink)" }}>
              What this is made of
            </h1>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Everything here either came out of an oscillator in your browser or
              was recorded by somebody who then gave it away. This page says
              which, and who.
            </p>
          </header>

          <nav className="mb-10 flex flex-wrap justify-center gap-x-4 gap-y-0 text-sm sm:mb-14">
            {[
              ["why", "why"],
              ["sound", "how the sounds are made"],
              ["music", "how the music is written"],
              ["recordings", "the recordings"],
              ["made", "everything else"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hand tap underline-offset-4 hover:underline" style={{ color: "var(--accent-text)" }}>
                {label}
              </a>
            ))}
          </nav>

          <Section id="why" title="Why" jp="所以">
            <p>
              <span className="deva" style={{ color: "var(--ink)" }}>
                ध्वनि
              </span>{" "}
              is Sanskrit for sound. Not noise, not music, not signal. Just
              sound, as a thing that exists.
            </p>
            <p>
              Most noise machines are a folder of MP3s on a loop. That is fine
              for ten minutes and quietly terrible for four hours, because
              looped audio gives itself away: you start recognising the same
              gust, the same car, the same laugh, and once you have heard the
              seam you cannot stop hearing it. The sound stops being a place and
              becomes a file.
            </p>
            <p>
              So most of Dhvani has no file to loop. The fire, the rain, the
              crowd, the music are all generated as you listen, from noise and
              oscillators and a scheduler. There is no hour two, because there
              is nothing to come back around. {synthCount} of the sounds here
              work that way. {sampleCount} are real recordings, used only where
              synthesis genuinely cannot stand in for a specific real place.
            </p>
            <p>
              The other half of it is that focus tools tend to look like
              software. This one is drawn by hand, on paper, and the paper
              responds to what you are playing. Turn on rain and it rains across
              the page. Light a fire and the sheet warms from below. It is not a
              dashboard for sound. It is the place you decided to sit in.
            </p>
          </Section>

          <Section id="sound" title="How the sounds are made" jp="音の作り方">
            <p>
              Every ambience is shaped noise plus scheduled events. The trick
              throughout is that the events are{" "}
              <em>Poisson distributed</em>: the gaps between them are random
              with a given average rate, rather than evenly spaced. That one
              decision is the difference between a campfire and a metronome.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card seed="c-fire">
                <Term word="Fire">
                  brown noise breathing under a lowpass filter, fine crackles
                  about eleven a second, and a proper pop roughly every two
                  seconds that splits into a cluster of splinters.
                </Term>
              </Card>
              <Card seed="c-rain">
                <Term word="Rain">
                  pink noise, which is already close to the spectrum of falling
                  water, with individual drops scattered on top. Rain on glass
                  is the same bed with everything above 1.4 kHz removed by the
                  wall.
                </Term>
              </Card>
              <Card seed="c-crowd">
                <Term word="Crowd">
                  the hardest one. Each talker is a source driven through three
                  formant filters whose centres jump between vowels at syllable
                  rate. Speech sits near four syllables a second, and anything
                  modulated at that rate reads as talking even when no word is
                  recoverable.
                </Term>
              </Card>
              <Card seed="c-bell">
                <Term word="Bells">
                  bronze is inharmonic. The partials of a temple bell are not
                  whole-number multiples of anything, which is why a bell has no
                  clear pitch. A gong goes further and{" "}
                  <em>blooms</em>, moving energy upward for a second or two
                  after the strike.
                </Term>
              </Card>
              <Card seed="c-wind">
                <Term word="Wind">
                  gusts driven by a slow random walk rather than an LFO, so the
                  wind never gets into a rhythm. A sine at 0.1 Hz is
                  recognisable as a machine within about ten minutes.
                </Term>
              </Card>
              <Card seed="c-noise">
                <Term word="Noise">
                  white is equal power per hertz, pink equal power per octave
                  (which is what most people mean when they say white), brown
                  deeper still, green gathered around 500 Hz where speech lives,
                  blue tilted up into the air.
                </Term>
              </Card>
            </div>
            <p>
              None of it loops because none of it is a loop. The longest buffer
              in the whole app is eight seconds of noise, and even that is
              continuously re-filtered so no periodicity is audible.
            </p>
          </Section>

          <Section id="music" title="How the music is written" jp="楽曲の書き方">
            <p>
              The music deck does not play tracks. It composes, one bar at a
              time, about two seconds ahead of what you are hearing. There are
              two modes, and they are built on genuinely different musical
              traditions.
            </p>

            <h3 className="hand mt-4 text-xl" style={{ color: "var(--ink)" }}>
              Lofi
            </h3>
            <p>
              Lofi lives on a very small set of moves, and the generator stays
              inside that box on purpose, because the music is meant to be
              furniture. Minor seventh and ninth colour, stepwise bass, a ii V
              somewhere, voicings kept rootless and inside about one octave so
              they sit behind the rain rather than in front of it.
            </p>
            <p>
              The feel matters more than the notes. The snare lands about
              twenty-two milliseconds behind the beat, the eighth notes are
              swung around fifty-seven percent, and the Rhodes chord arrives a
              fraction late. Then the whole thing is run through a tape chain: a
              modulated delay for wow and flutter, a tanh curve for saturation,
              a lowpass at seven kilohertz, and surface noise with pops
              scattered at the same Poisson rate as the fire crackles. The notes
              underneath are plain. Everything characterful is done by degrading
              them.
            </p>

            <h3 className="hand mt-6 text-xl" style={{ color: "var(--ink)" }}>
              Nocturne, and the operatic voice
            </h3>
            <p>
              The second mode runs on functional harmony rather than a loop, and
              on an actual synthesised singer. The things it knows:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card seed="c-lament">
                <Term word="The lament bass">
                  a bass line walking down four steps from the tonic to the
                  dominant. It carries Dido&apos;s Lament, the Crucifixus, and
                  roughly half of baroque opera. Descending motion under a held
                  voice is about as close as music gets to a reliable emotional
                  mechanism.
                </Term>
              </Card>
              <Card seed="c-circle">
                <Term word="Circle of fifths">
                  each chord&apos;s root a fifth below the last. It is the
                  engine of every development section ever written, because it
                  sounds like it is going somewhere without having to arrive.
                </Term>
              </Card>
              <Card seed="c-neap">
                <Term word="The Neapolitan">
                  a major chord built on the flattened second degree, leaning
                  its whole weight onto the dominant before it resolves. Dark,
                  and entirely out of key, which is the point.
                </Term>
              </Card>
              <Card seed="c-susp">
                <Term word="Suspensions">
                  hold a note from the old chord into the new one so it clashes,
                  then let it fall one step. The four three suspension is the
                  oldest expressive device in Western music and it still works
                  every time.
                </Term>
              </Card>
              <Card seed="c-alberti">
                <Term word="Alberti bass">
                  low, high, middle, high, repeating. The left hand of every
                  classical keyboard piece, which turns a static chord into
                  motion without adding a single new note.
                </Term>
              </Card>
              <Card seed="c-ground">
                <Term word="Ground">
                  a fixed bass pattern repeating underneath while everything
                  above it changes. Pachelbel built a canon on one; so did a
                  thousand arias after him.
                </Term>
              </Card>
            </div>
            <p>
              The voice is <strong style={{ color: "var(--ink)" }}>formant synthesis</strong>.
              A sawtooth stands in for the glottal pulse train and is driven
              through a bank of bandpass filters tuned to the resonances of a
              human vocal tract. Which vowel you hear is decided almost entirely
              by the first two formants: around 800 and 1150 hertz gives you
              &ldquo;ah&rdquo;, around 325 and 700 gives you &ldquo;oo&rdquo;.
            </p>
            <p>
              Three details do most of the work. The{" "}
              <strong style={{ color: "var(--ink)" }}>singer&apos;s formant</strong>,
              a resonance near 2.8 kHz, is what lets a trained voice carry over
              an orchestra without amplification; without it the voice sits
              behind everything and sounds like a pad. The{" "}
              <strong style={{ color: "var(--ink)" }}>vibrato is delayed</strong>,
              opening up as the singer leans into a note, because starting a
              note with full vibrato is the single biggest giveaway of a
              synthetic voice. And the first formant{" "}
              <strong style={{ color: "var(--ink)" }}>climbs with pitch</strong>,
              which is why a soprano high in her range loses the vowel
              altogether and turns into pure tone.
            </p>
            <p>
              There is no drum kit in this mode. Brushes, occasionally, and
              otherwise the strings keep the time, because a kit under a
              Neapolitan cadence would be absurd.
            </p>
          </Section>

          <Section id="recordings" title="The recordings" jp="録音">
            <p>
              {sampleCount} field recordings are used where synthesis cannot
              honestly stand in: a specific market in Palestine, a dawn chorus,
              the inside of a particular cathedral. Every one of them is{" "}
              <strong style={{ color: "var(--ink)" }}>CC0</strong>, which means
              the person who made it released it into the public domain and is
              owed nothing. They are credited here anyway, because being owed
              nothing and deserving nothing are different things.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {CREDITS.map((c) => (
                <div
                  key={c.id}
                  className="relative rounded-[14px] px-4 py-3"
                  style={{ background: "var(--paper-2)" }}
                >
                  <RoughBorder seedKey={`cr-${c.id}`} radius={14} stroke="var(--ink)" strokeWidth={1.3} opacity={0.3} />
                  <div className="relative z-10 flex flex-col gap-x-4 gap-y-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
                    <div className="min-w-0">
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hand tap text-[1.05rem] underline-offset-4 hover:underline"
                        style={{ color: "var(--ink)" }}
                      >
                        {c.author}
                      </a>
                      <span className="ml-2 text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
                        {c.id.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3 text-[0.75rem]" style={{ color: "var(--ink-soft)" }}>
                      <span>{Math.round(c.durationSeconds)}s</span>
                      <a
                        href={c.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap underline-offset-4 hover:underline"
                        style={{ color: "var(--accent-text)" }}
                      >
                        {c.license}
                      </a>
                    </div>
                  </div>
                  <p className="relative z-10 mt-1 text-[0.72rem]" style={{ color: "var(--ink-soft)", opacity: 0.8 }}>
                    {c.modified}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[0.8rem]">
              All of the above came from{" "}
              <a
                href="https://freesound.org"
                target="_blank"
                rel="noopener noreferrer"
                className="tap underline-offset-4 hover:underline"
                style={{ color: "var(--accent-text)" }}
              >
                Freesound
              </a>
              , filtered to the CC0 licence, with each sound&apos;s own page
              checked individually rather than trusting a search result.
            </p>
          </Section>

          <Section id="made" title="Everything else" jp="他">
            <div
              className="relative flex flex-col items-center gap-4 rounded-[18px] px-5 py-5 sm:flex-row sm:items-start sm:gap-6"
              style={{ background: "var(--paper-2)" }}
            >
              <RoughBorder seedKey="c-sakshi" radius={18} stroke="var(--accent)" strokeWidth={2} opacity={0.7} />
              <div className="relative z-10 shrink-0">
                <Logo height={54} reactive={false} />
              </div>
              <p className="relative z-10 text-[0.92rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                The logo is the word{" "}
                <span className="deva" style={{ color: "var(--ink)" }}>
                  ध्वनि
                </span>{" "}
                handwritten by{" "}
                <a
                  href="https://www.linkedin.com/in/sakshi-sawarkar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap underline-offset-4 hover:underline"
                  style={{ color: "var(--accent-text)" }}
                >
                  <strong>Sakshi Sawarkar</strong>
                </a>
                . She wrote it in felt-tip on a sheet of paper, and that sheet
                is what you are looking at: it was photographed, lifted off its
                background and traced to vector, and nothing else was done to
                it. The thick and thin of the stroke are where her pen slowed
                down and sped up. The shirorekha, the line that runs along the
                top and binds the letters together, is not straight, because
                nobody draws a straight line by hand and she did not. It would
                have taken ten minutes to tidy all of that up, and it is the
                entire reason the mark is worth having. Every hand-drawn edge
                elsewhere in this app, every border that will not sit still, is
                in the end an attempt to deserve this one real thing.
              </p>
            </div>

            <Card seed="c-author">
              <Term word="Dhvani">
                made by <strong style={{ color: "var(--ink)" }}>Eeman Majumder</strong>.
                The synthesis, the generative music, the drawing system and
                everything else here, except where this page says otherwise.
              </Term>
            </Card>
            <Card seed="c-art">
              <Term word="The background art">
                the clouds, mist, mountains, moon, enso, leaves and birds were
                painted by an image model and then cut apart, graded per theme
                and parallaxed here. They are graded differently on every paper,
                because art painted on white and dropped onto a dark sheet
                glows like a sticker.
              </Term>
            </Card>
            <Card seed="c-doodle">
              <Term word="The doodles">
                every icon is drawn in code as SVG paths, then redrawn three
                times with the line pushed around by a seeded noise and cycled
                at about eight frames a second. Hand-inked animation does this
                because the artist cannot trace the previous frame exactly, and
                the eye reads that failure as life.
              </Term>
            </Card>
            <Card seed="c-type">
              <Term word="Type">
                Zen Maru Gothic for the interface, Caveat for anything
                handwritten, and Kalam for the Devanagari. All three are
                licensed under the SIL Open Font License.
              </Term>
            </Card>
            <Card seed="c-colour">
              <Term word="Colour">
                six papers, each built from traditional Japanese colours: 桜
                sakura, 抹茶 matcha, 浅葱 asagi, 生成 kinari, 藤 fuji and 墨
                sumi. No theme is white and none is black.
              </Term>
            </Card>
            <Card seed="c-built">
              <Term word="Built with">
                Next.js, React and the Web Audio API, with no audio library in
                between. There is no server and no account; the mix lives in
                your browser and nowhere else.
              </Term>
            </Card>
          </Section>

          <footer className="mt-20 flex flex-col items-center gap-3 text-center">
            <Link href="/" className="hand tap text-base underline-offset-4 hover:underline" style={{ color: "var(--accent-text)" }}>
              back to the machine
            </Link>
            <p className="text-[0.82rem]" style={{ color: "var(--ink)" }}>
              Dhvani is made by Eeman Majumder.
            </p>
            <p className="text-[0.8rem]" style={{ color: "var(--ink)" }}>
              Logo by{" "}
              <a
                href="https://www.linkedin.com/in/sakshi-sawarkar/"
                target="_blank"
                rel="noopener noreferrer"
                className="tap underline-offset-4 hover:underline"
                style={{ color: "var(--accent-text)" }}
              >
                Sakshi Sawarkar
              </a>
              .
            </p>
            <p className="text-[0.74rem]" style={{ color: "var(--ink-soft)" }}>
              The field recordings are other people&apos;s, and they are named
              above.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

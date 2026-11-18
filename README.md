<div align="center">

<img src="public/brand/dhvani.svg" alt="Dhvani" width="260">

**A hand drawn noise machine that never loops.**

57 ambiences synthesised live in your browser, 27 public domain field
recordings, and a generative music deck that writes lofi and classical nocturnes
one bar at a time. Put it on and leave it on.

</div>

---

## What it is

Most noise machines are a folder of MP3s on a loop. That is fine for ten minutes
and quietly terrible for four hours, because looped audio gives itself away: you
start recognising the same gust, the same car, the same laugh, and once you have
heard the seam you cannot stop hearing it.

So most of Dhvani has no file to loop. The fire, the rain, the crowd and the
music are generated as you listen, from noise and oscillators and a lookahead
scheduler. There is no hour two, because there is nothing to come back around.

**[dhvani is live here](https://eeman1113.github.io/Dhvani/)**

## What is in it

- **57 synthesised ambiences** across rain, fire, wind, water, night,
  forest, people, zen, room, travel and noise colours. Nothing is a recording,
  so nothing repeats.
- **Crowds that are actually synthesised.** Each talker is a source driven
  through three formant filters whose centres jump between vowels at syllable
  rate. Speech sits near four syllables a second, and anything modulated at that
  rate reads as talking even when no word is recoverable.
- **A generative music deck** with two modes. *Lofi* writes minor ninth voicings
  over a laid back kit and runs the result through a tape chain with wow,
  flutter, saturation and vinyl surface noise. *Nocturne* runs on functional
  harmony, lament basses, circle of fifths sequences, Neapolitan cadences and
  four three suspensions, played by synthesised strings, harp, piano and an
  operatic voice built with formant synthesis.
- **27 CC0 field recordings** for the places synthesis cannot honestly
  fake. Every contributor is credited below and on the credits page.
- **A background that is the place you assembled.** Turn on rain and it rains
  across the page. Light a fire and the paper warms from below. Add crickets and
  the sheet darkens and fireflies come out.
- **Six papers** built from traditional Japanese colours, a sleep timer, and a
  mix that survives a reload.

## Running it

```bash
npm install
npm run dev
```

To build the static site exactly as GitHub Pages does:

```bash
NEXT_PUBLIC_BASE_PATH=/Dhvani npm run build
```

There is no server, no database and no account. Everything happens in the
browser, and the mix is stored in `localStorage` and nowhere else.

## Credits

### Field recordings

Every recording used is **CC0 1.0 Universal**, released into the public domain by
its author, who is owed nothing and credited anyway. All of them came from
[Freesound](https://freesound.org), with each sound's own licence page checked
individually rather than trusting a search result. Longer sources were trimmed
and re-encoded; `AUDIO_SOURCES.md` records exactly what was done to each file.

| sound | author | licence |
| --- | --- | --- |
| `airplane-cabin` | [drewhalasz](https://freesound.org/people/drewhalasz/sounds/433002/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `airport-terminal` | [loganzsound](https://freesound.org/people/loganzsound/sounds/868379/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `birds-dawn` | [SamsterBirdies](https://freesound.org/people/SamsterBirdies/sounds/745273/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `birds-dawn-2` | [squashy555](https://freesound.org/people/squashy555/sounds/573080/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `blizzard` | [m0ments](https://freesound.org/people/m0ments/sounds/679941/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `church-interior` | [Henrythetrain](https://freesound.org/people/Henrythetrain/sounds/146397/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `city-street` | [lastraindrop](https://freesound.org/people/lastraindrop/sounds/716384/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `clock-ticking` | [se2001](https://freesound.org/people/se2001/sounds/511967/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `coffee-shop` | [wesleywestmusic](https://freesound.org/people/wesleywestmusic/sounds/680688/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `crowd-cafe` | [lydgutten](https://freesound.org/people/lydgutten/sounds/774240/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `fireplace` | [BonnyOrbit](https://freesound.org/people/BonnyOrbit/sounds/484338/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `forest-brook` | [Irolan](https://freesound.org/people/Irolan/sounds/488324/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `forest-night` | [fribergmusic2024](https://freesound.org/people/fribergmusic2024/sounds/719558/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `frogs-night` | [heyheymaimai](https://freesound.org/people/heyheymaimai/sounds/493066/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `harbour-seagulls` | [ivolipa](https://freesound.org/people/ivolipa/sounds/328808/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `library` | [xkeril](https://freesound.org/people/xkeril/sounds/620683/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `market-bazaar` | [sounds_from_palestine](https://freesound.org/people/sounds_from_palestine/sounds/819223/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pages-turning` | [P_Chester](https://freesound.org/people/P_Chester/sounds/465260/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pencil-writing` | [magnus1906](https://freesound.org/people/magnus1906/sounds/513938/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `refrigerator-hum` | [adamdavidsmith](https://freesound.org/people/adamdavidsmith/sounds/877268/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `restaurant-chatter` | [felix.blume](https://freesound.org/people/felix.blume/sounds/422097/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `subway-station` | [florianreichelt](https://freesound.org/people/florianreichelt/sounds/451720/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `temple-bells` | [Paresh](https://freesound.org/people/Paresh/sounds/423401/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `thunderstorm` | [Audeption](https://freesound.org/people/Audeption/sounds/698811/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `train-interior` | [pblzr](https://freesound.org/people/pblzr/sounds/785398/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `washing-machine` | [oliwoli](https://freesound.org/people/oliwoli/sounds/548461/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `wind-chimes` | [giddster](https://freesound.org/people/giddster/sounds/437337/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

### Type

- **Zen Maru Gothic** by Yoshimichi Ohira, [SIL Open Font License 1.1](https://openfontlicense.org)
- **Caveat** by Pablo Impallari, [SIL Open Font License 1.1](https://openfontlicense.org)
- **Kalam** by Indian Type Foundry, [SIL Open Font License 1.1](https://openfontlicense.org)

### Art and code

- The logo is the word **ध्वनि** written in felt tip by **Eeman Majumder**,
  photographed, cut out of its background and traced to vector.
- The painted background art (clouds, mist, mountains, moon, enso, leaves,
  birds) was generated with an image model, then cut apart, graded per theme and
  parallaxed by hand.
- Every icon is drawn in code as SVG paths, redrawn three times with the line
  pushed around by a seeded noise and cycled at about eight frames a second.
- Built with [Next.js](https://nextjs.org), [React](https://react.dev) and the
  Web Audio API, with no audio library in between.

## Licence

Code is MIT. The field recordings are CC0 and carry no conditions. The logo is
Eeman Majumder's own handwriting; please do not pass it off as your own.

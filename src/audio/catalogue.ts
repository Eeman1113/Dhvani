import type { ThemeId } from "@/lib/themes";

export type SoundGroup =
  | "ame"
  | "hi"
  | "kaze"
  | "mizu"
  | "yoru"
  | "mori"
  | "hito"
  | "zen"
  | "shitsu"
  | "tabi"
  | "oto";

export const GROUPS: {
  id: SoundGroup;
  name: string;
  jp: string;
  blurb: string;
}[] = [
  { id: "ame", name: "Rain", jp: "雨", blurb: "weather on the other side of the glass" },
  { id: "hi", name: "Fire", jp: "火", blurb: "something burning slowly in the room" },
  { id: "kaze", name: "Wind", jp: "風", blurb: "air moving through a place you are not" },
  { id: "mizu", name: "Water", jp: "水", blurb: "water with somewhere to be" },
  { id: "yoru", name: "Night", jp: "夜", blurb: "the hours when the world gets quiet" },
  { id: "mori", name: "Forest", jp: "森", blurb: "somewhere with trees over it" },
  { id: "hito", name: "People", jp: "人", blurb: "company, without conversation" },
  { id: "zen", name: "Zen", jp: "禅", blurb: "struck things, ringing out" },
  { id: "shitsu", name: "Room", jp: "室", blurb: "the small machinery of being indoors" },
  { id: "tabi", name: "Travel", jp: "旅", blurb: "moving, with nowhere to be yet" },
  { id: "oto", name: "Noise", jp: "音", blurb: "the flat colours of sound" },
];

export type Sound = {
  id: string;
  name: string;
  jp: string;
  group: SoundGroup;
  /** Which doodle to draw on the card. */
  doodle: string;
  /** Starting fader position, 0..1. Tuned so a fresh stack sits balanced. */
  defaultLevel: number;
  /** Shown on the card back / credits page. */
  note: string;
} & (
  | { kind: "synth" }
  | {
      kind: "sample";
      /** Path under /public/audio. */
      src: string;
      /** Seamless loop region, seconds. Omit to loop the whole file. */
      loop?: [number, number];
      /** Key into CREDITS. */
      credit: string;
    }
);

export const SOUNDS: Sound[] = [
  // 雨 rain
  { id: "rain-light", name: "Light Rain", jp: "小雨", group: "ame", doodle: "rain", kind: "synth", defaultLevel: 0.55, note: "Pink noise shaped to the spectrum of falling water, with individual drops scattered on top." },
  { id: "rain-heavy", name: "Downpour", jp: "大雨", group: "ame", doodle: "downpour", kind: "synth", defaultLevel: 0.45, note: "The same bed, widened and weighted, at four times the drop density." },
  { id: "rain-window", name: "Rain on Glass", jp: "窓の雨", group: "ame", doodle: "window", kind: "synth", defaultLevel: 0.5, note: "Rain heard from inside, with everything above 1.4 kHz taken away by the wall." },
  { id: "rain-tent", name: "Rain on Canvas", jp: "天幕の雨", group: "ame", doodle: "tent", kind: "synth", defaultLevel: 0.45, note: "A stretched surface rings at a pitch when you hit it. That resonance is why a tent sounds nothing like grass." },
  { id: "rain-leaves", name: "Rain in Leaves", jp: "木の葉の雨", group: "ame", doodle: "rainleaf", kind: "synth", defaultLevel: 0.45, note: "Brighter and more scattered, each drop landing on something that gives." },
  { id: "thunder", name: "Distant Thunder", jp: "遠雷", group: "ame", doodle: "thunder", kind: "synth", defaultLevel: 0.4, note: "A roll every forty seconds or so, at random. Occasionally it lands close." },

  // 火 fire
  { id: "fire", name: "Campfire", jp: "焚火", group: "hi", doodle: "fire", kind: "synth", defaultLevel: 0.55, note: "A breathing low roar, fine ticking, and the odd pop that splits into splinters." },

  // 風 wind
  { id: "wind", name: "Low Wind", jp: "風", group: "kaze", doodle: "wind", kind: "synth", defaultLevel: 0.4, note: "Gusts driven by a random walk, so the wind gets brighter as it gets louder." },
  { id: "wind-high", name: "Mountain Wind", jp: "山風", group: "kaze", doodle: "mountain", kind: "synth", defaultLevel: 0.35, note: "Thin air over bare rock. No low body at all, which is the whole difference from the one above." },
  { id: "blizzard", name: "Blizzard", jp: "吹雪", group: "kaze", doodle: "snow", kind: "synth", defaultLevel: 0.4, note: "Hard gusts with fine ice driven against the surface you are sheltering behind." },
  { id: "leaves", name: "Leaves", jp: "葉擦れ", group: "kaze", doodle: "leaves", kind: "synth", defaultLevel: 0.4, note: "Thousands of small ticks whose density rises and falls with the gust." },
  { id: "chimes", name: "Wind Chimes", jp: "風鈴", group: "kaze", doodle: "chime", kind: "synth", defaultLevel: 0.3, note: "Inharmonic tube partials in a major pentatonic, rung in clusters when the wind catches them." },

  // 水 water
  { id: "waves", name: "Ocean", jp: "波", group: "mizu", doodle: "wave", kind: "synth", defaultLevel: 0.5, note: "A nine second swell that drifts over minutes, with foam that only appears at the crest." },
  { id: "stream", name: "Stream", jp: "小川", group: "mizu", doodle: "stream", kind: "synth", defaultLevel: 0.4, note: "Bright moving water, with resonant filter sweeps standing in for bubbles." },
  { id: "rapids", name: "Rapids", jp: "早瀬", group: "mizu", doodle: "rapids", kind: "synth", defaultLevel: 0.4, note: "The same river in a hurry. Far more churn, and a low bed underneath it." },
  { id: "waterfall", name: "Waterfall", jp: "滝", group: "mizu", doodle: "waterfall", kind: "synth", defaultLevel: 0.4, note: "Mass of falling water surges rather than sitting still, and the spray brightens as it does." },
  { id: "underwater", name: "Underwater", jp: "水中", group: "mizu", doodle: "underwater", kind: "synth", defaultLevel: 0.45, note: "Everything above 320 Hz gone, with bubbles rising in little clusters." },
  { id: "cave-drip", name: "Cave Drips", jp: "滴り", group: "mizu", doodle: "drip", kind: "synth", defaultLevel: 0.4, note: "A drip is a pitch that rises as the cavity it made closes up. The space answers each one." },

  // 夜 night
  { id: "crickets", name: "Crickets", jp: "虫の音", group: "yoru", doodle: "cricket", kind: "synth", defaultLevel: 0.35, note: "Seven insects, each with its own pitch, position and tempo, interfering with each other." },
  { id: "cicadas", name: "Cicadas", jp: "蝉", group: "yoru", doodle: "cicada", kind: "synth", defaultLevel: 0.3, note: "A carrier buzzing near 5 kHz, amplitude modulated in the tens of hertz. The modulation is the insect." },
  { id: "frogs", name: "Frogs", jp: "蛙", group: "yoru", doodle: "frog", kind: "synth", defaultLevel: 0.35, note: "Six throats around a pond, each with its own pulse rate. Pulse rate sets the species as much as pitch." },
  { id: "owls", name: "Owls", jp: "梟", group: "yoru", doodle: "owl", kind: "synth", defaultLevel: 0.35, note: "Nearly a pure tone with a breathy edge, in answering pairs, about three times a minute." },

  // 人 people
  { id: "crowd-cafe", name: "Cafe", jp: "喫茶店", group: "hito", doodle: "cafe", kind: "synth", defaultLevel: 0.45, note: "Seven synthetic talkers, cups, and an espresso machine that fires now and then. No two minutes are ever the same." },
  { id: "crowd-restaurant", name: "Restaurant", jp: "食堂", group: "hito", doodle: "plate", kind: "synth", defaultLevel: 0.4, note: "Eleven voices, far more crockery, and people interrupting each other." },
  { id: "crowd-bar", name: "Bar", jp: "酒場", group: "hito", doodle: "glass", kind: "synth", defaultLevel: 0.4, note: "Fourteen voices, short phrases, and a laugh every twenty seconds or so." },
  { id: "crowd-market", name: "Market", jp: "市場", group: "hito", doodle: "market", kind: "synth", defaultLevel: 0.4, note: "Open air, so nothing is muffled and the voices carry further apart." },
  { id: "crowd-office", name: "Office", jp: "事務所", group: "hito", doodle: "desk", kind: "synth", defaultLevel: 0.35, note: "Four people, mostly not talking, over a lot of air handling." },
  { id: "crowd-lobby", name: "Through a Wall", jp: "隣室", group: "hito", doodle: "door", kind: "synth", defaultLevel: 0.45, note: "All the rhythm of speech and none of the consonants. The most useful of these for actually working." },
  { id: "crowd-library", name: "Library", jp: "図書館", group: "hito", doodle: "book", kind: "synth", defaultLevel: 0.4, note: "Two people who will say something roughly twice a minute, and otherwise the room itself." },

  // 禅 zen
  { id: "bowl", name: "Singing Bowl", jp: "鈴", group: "zen", doodle: "bowl", kind: "synth", defaultLevel: 0.4, note: "Five inharmonic partials with staggered decays, struck about twice a minute." },
  { id: "temple-bell", name: "Temple Bell", jp: "梵鐘", group: "zen", doodle: "bell", kind: "synth", defaultLevel: 0.4, note: "Eight partials over a very low hum tone, the longest of them ringing for half a minute." },
  { id: "gong", name: "Gong", jp: "銅鑼", group: "zen", doodle: "gong", kind: "synth", defaultLevel: 0.35, note: "Twenty two inharmonic partials that bloom upward for a second or two after the strike before they fade." },
  { id: "shishi-odoshi", name: "Shishi-odoshi", jp: "鹿威し", group: "zen", doodle: "bamboo", kind: "synth", defaultLevel: 0.35, note: "The bamboo fills, tips, knocks the stone, and pours itself out." },
  { id: "flute", name: "Bamboo Flute", jp: "尺八", group: "zen", doodle: "flute", kind: "synth", defaultLevel: 0.35, note: "Long notes from a minor pentatonic with wide silences. The breath across the edge is half the instrument." },
  { id: "rainstick", name: "Rainstick", jp: "雨音筒", group: "zen", doodle: "rainstick", kind: "synth", defaultLevel: 0.35, note: "Grains falling past pins, thinning out and then turned over again." },
  { id: "drone-low", name: "Low Drone", jp: "低い響き", group: "zen", doodle: "drone", kind: "synth", defaultLevel: 0.35, note: "Root, fifth and octave, detuned and drifting, so the beating never settles into a pattern." },
  { id: "drone-high", name: "Open Drone", jp: "高い響き", group: "zen", doodle: "drone2", kind: "synth", defaultLevel: 0.3, note: "The same idea an octave up, where it stops being a floor and starts being a room." },

  // 室 room
  { id: "keyboard-soft", name: "Soft Keys", jp: "静音", group: "shitsu", doodle: "keyboard", kind: "synth", defaultLevel: 0.3, note: "A laptop board. Almost no switch, mostly the dull sound of the case taking the hit." },
  { id: "keyboard-tactile", name: "Tactile Keys", jp: "打鍵", group: "shitsu", doodle: "keyboard2", kind: "synth", defaultLevel: 0.3, note: "A bump you can hear but not a click. The middle of the three, and the one most people actually type on." },
  { id: "keyboard-clicky", name: "Clicky Keys", jp: "青軸", group: "shitsu", doodle: "keyboard3", kind: "synth", defaultLevel: 0.28, note: "Two clicks per press: the switch, then the click jacket an instant later, up at 5 kHz." },
  { id: "keyboard-thock", name: "Thocky Keys", jp: "重打", group: "shitsu", doodle: "keyboard4", kind: "synth", defaultLevel: 0.32, note: "Low and round. The bottom-out is the loudest part, which is the whole point of the build." },
  { id: "typewriter", name: "Typewriter", jp: "打字機", group: "shitsu", doodle: "typewriter", kind: "synth", defaultLevel: 0.3, note: "Hammers on a platen, a margin bell at the end of every line, and the carriage thrown back by hand." },
  { id: "paper", name: "Writing", jp: "筆記", group: "shitsu", doodle: "pen", kind: "synth", defaultLevel: 0.3, note: "Short strokes with thinking pauses between them, and a page turned every half minute." },
  { id: "clock", name: "Clock", jp: "時計", group: "shitsu", doodle: "clock", kind: "synth", defaultLevel: 0.3, note: "Tick and tock are different sounds. The escapement hits two different pallets, and a real pendulum is never quite even." },
  { id: "fan", name: "Fan", jp: "扇風機", group: "shitsu", doodle: "fan", kind: "synth", defaultLevel: 0.35, note: "Three detuned saws beating against each other under a bed of moving air." },
  { id: "fridge", name: "Refrigerator", jp: "冷蔵庫", group: "shitsu", doodle: "fridge", kind: "synth", defaultLevel: 0.35, note: "Mains hum and its harmonics over a motor that cycles on and off across several minutes." },
  { id: "washing", name: "Washing Machine", jp: "洗濯機", group: "shitsu", doodle: "washing", kind: "synth", defaultLevel: 0.35, note: "The drum turns one way, pauses, and turns back. Everything else follows that." },
  { id: "kettle", name: "Kettle", jp: "薬缶", group: "shitsu", doodle: "kettle", kind: "synth", defaultLevel: 0.3, note: "Forty bubbles a second against a resonant metal body, and steam on top." },
  { id: "heartbeat", name: "Heartbeat", jp: "鼓動", group: "shitsu", doodle: "heart", kind: "synth", defaultLevel: 0.3, note: "Lub then dub, two valve closures rather than one beat, drifting with the breath between 52 and 72." },

  // 旅 travel
  { id: "cabin", name: "Cabin", jp: "機内", group: "tabi", doodle: "plane", kind: "synth", defaultLevel: 0.4, note: "The low, enveloping drone of being in transit with nowhere to be." },
  { id: "train", name: "Train", jp: "列車", group: "tabi", doodle: "train", kind: "synth", defaultLevel: 0.4, note: "Rail joints come in pairs because each carriage has two bogies, and the carriages are all the same length." },
  { id: "traffic", name: "Traffic", jp: "車道", group: "tabi", doodle: "traffic", kind: "synth", defaultLevel: 0.35, note: "Each vehicle sweeps across the stereo field and brightens as it draws level with you." },

  // 音 noise
  { id: "noise-white", name: "White", jp: "白", group: "oto", doodle: "white", kind: "synth", defaultLevel: 0.3, note: "Equal power at every frequency. The loudest-feeling of the colours." },
  { id: "noise-pink", name: "Pink", jp: "桃", group: "oto", doodle: "pink", kind: "synth", defaultLevel: 0.4, note: "Equal power per octave, which is what most people actually mean by white noise." },
  { id: "noise-brown", name: "Brown", jp: "茶", group: "oto", doodle: "brown", kind: "synth", defaultLevel: 0.5, note: "Deeper still. Closest to a distant waterfall, and the kindest over long hours." },
  { id: "noise-green", name: "Green", jp: "緑", group: "oto", doodle: "green", kind: "synth", defaultLevel: 0.4, note: "Energy gathered around 500 Hz, near the centre of hearing. Masks speech better than any of the others." },
  { id: "noise-blue", name: "Blue", jp: "青", group: "oto", doodle: "blue", kind: "synth", defaultLevel: 0.25, note: "Tilted upward, all air. Good against a clattering keyboard, hard going for long." },

  /* ------------------------------------------------------------------ */
  /* field recordings                                                    */
  /*                                                                     */
  /* Everything above this line is synthesised. Everything below it was  */
  /* recorded by a person who then gave it away. They are here because   */
  /* synthesis cannot convincingly fake a specific real place, and       */
  /* because a dawn chorus is beyond what oscillators should attempt.    */
  /* Every one is CC0. See the credits page.                             */
  /* ------------------------------------------------------------------ */
  { id: "rec-crowd-cafe", name: "Cafe Room", jp: "喫茶店", group: "hito", doodle: "cafe", kind: "sample", src: "/audio/crowd-cafe.mp3", credit: "crowd-cafe", defaultLevel: 0.45, note: "A real room with real people in it, recorded in Norway. The counterpart to the synthesised cafe above." },
  { id: "rec-restaurant-chatter", name: "Restaurant Room", jp: "食堂", group: "hito", doodle: "plate", kind: "sample", src: "/audio/restaurant-chatter.mp3", credit: "restaurant-chatter", defaultLevel: 0.4, note: "Recorded by Félix Blume, who spends his life pointing microphones at places." },
  { id: "rec-coffee-shop", name: "Coffee Shop", jp: "珈琲店", group: "hito", doodle: "cafe", kind: "sample", src: "/audio/coffee-shop.mp3", credit: "coffee-shop", defaultLevel: 0.4, note: "Cups, the machine, and a low ceiling." },
  { id: "rec-market-bazaar", name: "Bazaar", jp: "市", group: "hito", doodle: "market", kind: "sample", src: "/audio/market-bazaar.mp3", credit: "market-bazaar", defaultLevel: 0.4, note: "An open market in Palestine. Voices carry differently with no roof over them." },
  { id: "rec-library", name: "Library Room", jp: "図書館", group: "hito", doodle: "book", kind: "sample", src: "/audio/library.mp3", credit: "library", defaultLevel: 0.45, note: "Mostly the building. Someone moves about once a minute." },
  { id: "rec-church-interior", name: "Cathedral", jp: "聖堂", group: "zen", doodle: "bell", kind: "sample", src: "/audio/church-interior.mp3", credit: "church-interior", defaultLevel: 0.45, note: "A very large stone room doing nothing at all, which turns out to be a sound." },
  { id: "rec-temple-bells", name: "Temple Bells", jp: "鐘", group: "zen", doodle: "bell", kind: "sample", src: "/audio/temple-bells.mp3", credit: "temple-bells", defaultLevel: 0.4, note: "Recorded bronze, for when the synthesised bell is too clean." },
  { id: "rec-wind-chimes", name: "Chimes Outside", jp: "風鈴", group: "kaze", doodle: "chime", kind: "sample", src: "/audio/wind-chimes.mp3", credit: "wind-chimes", defaultLevel: 0.35, note: "Real tubes in a real garden, with the garden audible behind them." },
  { id: "rec-blizzard", name: "Blizzard Outside", jp: "猛吹雪", group: "kaze", doodle: "snow", kind: "sample", src: "/audio/blizzard.mp3", credit: "blizzard", defaultLevel: 0.4, note: "The recorded version. Harsher and less even than the synthesised one." },
  { id: "rec-fireplace", name: "Fireplace", jp: "暖炉", group: "hi", doodle: "fire", kind: "sample", src: "/audio/fireplace.mp3", credit: "fireplace", defaultLevel: 0.5, note: "A proper hearth with logs in it, two minutes of it." },
  { id: "rec-thunderstorm", name: "Thunderstorm", jp: "雷雨", group: "ame", doodle: "thunder", kind: "sample", src: "/audio/thunderstorm.mp3", credit: "thunderstorm", defaultLevel: 0.45, note: "Rain and thunder together, as they actually arrive." },
  { id: "rec-harbour-seagulls", name: "Harbour", jp: "港", group: "mizu", doodle: "wave", kind: "sample", src: "/audio/harbour-seagulls.mp3", credit: "harbour-seagulls", defaultLevel: 0.4, note: "Water against stone, boats, and gulls who have opinions." },
  { id: "rec-forest-brook", name: "Forest Brook", jp: "沢", group: "mori", doodle: "stream", kind: "sample", src: "/audio/forest-brook.mp3", credit: "forest-brook", defaultLevel: 0.4, note: "A small stream with trees over it." },
  { id: "rec-forest-night", name: "Forest at Night", jp: "夜の森", group: "mori", doodle: "owl", kind: "sample", src: "/audio/forest-night.mp3", credit: "forest-night", defaultLevel: 0.4, note: "What a forest does when nobody is in it." },
  { id: "rec-birds-dawn", name: "Dawn Chorus", jp: "朝の鳥", group: "mori", doodle: "bird", kind: "sample", src: "/audio/birds-dawn.mp3", credit: "birds-dawn", defaultLevel: 0.4, note: "The half hour before sunrise, when every bird decides to speak at once." },
  { id: "rec-birds-dawn-2", name: "Birds", jp: "鳥", group: "mori", doodle: "bird", kind: "sample", src: "/audio/birds-dawn-2.mp3", credit: "birds-dawn-2", defaultLevel: 0.4, note: "A second chorus, further off and less busy." },
  { id: "rec-frogs-night", name: "Frogs at Night", jp: "夜の蛙", group: "mori", doodle: "frog", kind: "sample", src: "/audio/frogs-night.mp3", credit: "frogs-night", defaultLevel: 0.4, note: "A real pond, which is messier than the synthesised one and better for it." },
  { id: "rec-train-interior", name: "Train Carriage", jp: "車内", group: "tabi", doodle: "train", kind: "sample", src: "/audio/train-interior.mp3", credit: "train-interior", defaultLevel: 0.45, note: "Inside a moving carriage. The joints are not as even as the synthesised ones." },
  { id: "rec-subway-station", name: "Subway Station", jp: "駅", group: "tabi", doodle: "train", kind: "sample", src: "/audio/subway-station.mp3", credit: "subway-station", defaultLevel: 0.4, note: "Platform, tunnel, and the air they push ahead of them." },
  { id: "rec-city-street", name: "City Street", jp: "街", group: "tabi", doodle: "traffic", kind: "sample", src: "/audio/city-street.mp3", credit: "city-street", defaultLevel: 0.4, note: "Traffic with buildings on both sides of it." },
  { id: "rec-airport-terminal", name: "Airport", jp: "空港", group: "tabi", doodle: "desk", kind: "sample", src: "/audio/airport-terminal.mp3", credit: "airport-terminal", defaultLevel: 0.4, note: "A terminal at Seattle. Announcements, distance, and nothing to do." },
  { id: "rec-airplane-cabin", name: "Airplane Cabin", jp: "機内", group: "tabi", doodle: "plane", kind: "sample", src: "/audio/airplane-cabin.mp3", credit: "airplane-cabin", defaultLevel: 0.45, note: "The recorded cabin, with passengers in it." },
  { id: "rec-pages-turning", name: "Pages", jp: "頁", group: "shitsu", doodle: "book", kind: "sample", src: "/audio/pages-turning.mp3", credit: "pages-turning", defaultLevel: 0.3, note: "Someone else reading a physical book, slowly." },
  { id: "rec-pencil-writing", name: "Pencil", jp: "鉛筆", group: "shitsu", doodle: "pen", kind: "sample", src: "/audio/pencil-writing.mp3", credit: "pencil-writing", defaultLevel: 0.3, note: "Graphite on paper, which sounds nothing like a pen." },
  { id: "rec-clock-ticking", name: "Wall Clock", jp: "柱時計", group: "shitsu", doodle: "clock", kind: "sample", src: "/audio/clock-ticking.mp3", credit: "clock-ticking", defaultLevel: 0.3, note: "A real escapement, with all the unevenness that implies." },
  { id: "rec-washing-machine", name: "Washer", jp: "洗濯", group: "shitsu", doodle: "washing", kind: "sample", src: "/audio/washing-machine.mp3", credit: "washing-machine", defaultLevel: 0.35, note: "A full cycle, recorded from the next room." },
  { id: "rec-refrigerator-hum", name: "Fridge Hum", jp: "冷蔵", group: "shitsu", doodle: "fridge", kind: "sample", src: "/audio/refrigerator-hum.mp3", credit: "refrigerator-hum", defaultLevel: 0.35, note: "One compressor, running." },
];

export const SOUND_BY_ID: Record<string, Sound> = Object.fromEntries(
  SOUNDS.map((s) => [s.id, s]),
);

/* ------------------------------------------------------------------ */
/* presets                                                             */
/* ------------------------------------------------------------------ */

export type Preset = {
  id: string;
  name: string;
  jp: string;
  blurb: string;
  /** soundId -> level */
  mix: Record<string, number>;
  lofi?: { on: boolean; level: number };
  theme?: ThemeId;
};

export const PRESETS: Preset[] = [
  {
    id: "study",
    name: "Deep Work",
    jp: "集中",
    blurb: "rain, a fan, and someone else typing",
    mix: { "rain-window": 0.5, fan: 0.3, "keyboard-tactile": 0.25 },
    theme: "kinari",
  },
  {
    id: "hearth",
    name: "Hearth",
    jp: "炉",
    blurb: "a fire going while it rains outside",
    mix: { fire: 0.6, "rain-window": 0.35, thunder: 0.3, clock: 0.22 },
    theme: "sakura",
  },
  {
    id: "cafe",
    name: "Third Place",
    jp: "喫茶",
    blurb: "a cafe you are not expected to talk in",
    mix: { "crowd-cafe": 0.5, "rain-window": 0.3, paper: 0.25 },
    theme: "kinari",
  },
  {
    id: "temple",
    name: "Temple Garden",
    jp: "庭",
    blurb: "bamboo, bowl and a little wind",
    mix: { "shishi-odoshi": 0.45, bowl: 0.35, wind: 0.25, stream: 0.3, "temple-bell": 0.3 },
    theme: "matcha",
  },
  {
    id: "shore",
    name: "Shore",
    jp: "渚",
    blurb: "the sea doing what it always does",
    mix: { waves: 0.6, "wind-high": 0.25, chimes: 0.2 },
    theme: "asagi",
  },
  {
    id: "night",
    name: "Late Night",
    jp: "深夜",
    blurb: "crickets, a far off storm, lofi underneath",
    mix: { crickets: 0.4, thunder: 0.25, "rain-light": 0.3, frogs: 0.25 },
    lofi: { on: true, level: 0.45 },
    theme: "sumi",
  },
  {
    id: "transit",
    name: "In Transit",
    jp: "移動中",
    blurb: "a train, and the weather going past",
    mix: { train: 0.45, "rain-window": 0.3, "crowd-lobby": 0.25 },
    theme: "fuji",
  },
  {
    id: "summer",
    name: "Summer Afternoon",
    jp: "夏の午後", 
    blurb: "cicadas, chimes, and nothing to do",
    mix: { cicadas: 0.35, chimes: 0.3, leaves: 0.35, "wind-high": 0.2 },
    theme: "matcha",
  },
  {
    id: "forest",
    name: "Deep Forest",
    jp: "森",
    blurb: "a stream, leaves, and rain somewhere above",
    mix: { stream: 0.4, leaves: 0.4, "rain-leaves": 0.35, owls: 0.25 },
    theme: "matcha",
  },
  {
    id: "quiet",
    name: "Nothing Much",
    jp: "静",
    blurb: "brown noise and a clock, for when anything else is too much",
    mix: { "noise-brown": 0.45, clock: 0.25 },
    theme: "kinari",
  },
  {
    id: "cave",
    name: "Underground",
    jp: "洞",
    blurb: "drips in a hard empty space",
    mix: { "cave-drip": 0.5, underwater: 0.3, "drone-low": 0.3 },
    theme: "sumi",
  },
  {
    id: "nocturne",
    name: "Nocturne",
    jp: "夜想",
    blurb: "strings and a voice, over rain",
    mix: { "rain-light": 0.35, fire: 0.3 },
    lofi: { on: true, level: 0.5 },
    theme: "fuji",
  },
];

/**
 * Zen pastel Japanese palettes.
 *
 * Every colour is a traditional Japanese colour (和色) or a close pastel of one.
 * A theme is paper first: Dhvani is a sheet of paper someone drew on, so the
 * background is always a tinted stock, never white and never pure black.
 */

export type ThemeId =
  | "sakura"
  | "matcha"
  | "asagi"
  | "kinari"
  | "fuji"
  | "sumi";

export type Theme = {
  id: ThemeId;
  /** Romaji name shown in the switcher. */
  name: string;
  /** The kanji/kana, shown small beside it. */
  jp: string;
  /** One-line mood, used as the switcher tooltip. */
  mood: string;
  dark: boolean;
  /**
   * How the painted background art is graded on this paper.
   *
   * The clouds and mountains were painted once, on white. Dropping them
   * unchanged onto a dark sheet leaves them glowing like cut-out stickers,
   * and onto a pink sheet leaves them looking borrowed. Grading each theme
   * separately is what makes the art feel painted *for* the paper.
   */
  art: string;
  colors: {
    /** Page stock. */
    paper: string;
    /** Slightly deeper stock for cards sitting on the page. */
    paper2: string;
    /** Deeper still — pressed states, wells. */
    paper3: string;
    /** Ink the doodles are drawn in. */
    ink: string;
    /** Faded ink for secondary text. */
    inkSoft: string;
    /** Pencil-light ink for hairlines. */
    line: string;
    /** The one saturated colour. Active sounds, sliders, highlights. */
    accent: string;
    /**
     * The accent, darkened until it clears 4.5:1 on the paper.
     *
     * The decorative accent is chosen to look right as a stroke or a fill,
     * which on a pale paper means it is nowhere near readable as 12px text.
     * Rather than compromise the palette, text gets its own value. Use
     * `accent` for anything drawn and `accentText` for anything read.
     */
    accentText: string;
    /** Secondary accent for the lofi deck and warm states. */
    accent2: string;
    /** Wash behind an active card. */
    wash: string;
  };
};

export const THEMES: Theme[] = [
  {
    id: "sakura",
    name: "Sakura",
    jp: "桜",
    mood: "petals on still water",
    dark: false,
    art: "saturate(0.72) hue-rotate(-12deg) brightness(1.02)",
    colors: {
      paper: "#fdeff2",
      paper2: "#fbdbe2",
      paper3: "#fac1ce",
      ink: "#4a3540",
      inkSoft: "#65535c",
      line: "#f3b1bf",
      accent: "#d58fa6",
      accentText: "#913654",
      accent2: "#b0869f",
      wash: "#ead2da",
    },
  },
  {
    id: "matcha",
    name: "Matcha",
    jp: "抹茶",
    mood: "tea whisked at dawn",
    dark: false,
    art: "saturate(0.6) hue-rotate(38deg) brightness(1.0)",
    colors: {
      paper: "#eef3e4",
      paper2: "#e5edd5",
      paper3: "#d9e6c1",
      ink: "#39412f",
      inkSoft: "#576151",
      line: "#cfdcb4",
      accent: "#88a86f",
      accentText: "#4f663d",
      accent2: "#7eb3a0",
      wash: "#d2e0c7",
    },
  },
  {
    id: "asagi",
    name: "Asagi",
    jp: "浅葱",
    mood: "shallow water, long morning",
    dark: false,
    art: "saturate(0.8) hue-rotate(-6deg) brightness(1.02)",
    colors: {
      paper: "#e9f3f4",
      paper2: "#daeced",
      paper3: "#c7e2e5",
      ink: "#2c4047",
      inkSoft: "#4f6269",
      line: "#bad8db",
      accent: "#5fa8b4",
      accentText: "#32646c",
      accent2: "#8aa9c4",
      wash: "#cadfe2",
    },
  },
  {
    id: "kinari",
    name: "Kinari",
    jp: "生成",
    mood: "undyed linen, warm lamp",
    dark: false,
    art: "saturate(0.52) sepia(0.22) brightness(1.03)",
    colors: {
      paper: "#f7f2e7",
      paper2: "#f2e9d6",
      paper3: "#eddfc1",
      ink: "#423a2e",
      inkSoft: "#645b4f",
      line: "#e4d5b3",
      accent: "#bb9a63",
      accentText: "#725a32",
      accent2: "#a8886f",
      wash: "#e3daca",
    },
  },
  {
    id: "fuji",
    name: "Fuji",
    jp: "藤",
    mood: "wisteria in the late afternoon",
    dark: false,
    art: "saturate(0.78) hue-rotate(14deg) brightness(1.01)",
    colors: {
      paper: "#f0ecf6",
      paper2: "#e4ddef",
      paper3: "#d6cae8",
      ink: "#3b3550",
      inkSoft: "#59536f",
      line: "#cabcde",
      accent: "#9188c6",
      accentText: "#564a9b",
      accent2: "#b18fb9",
      wash: "#d1cee4",
    },
  },
  {
    id: "sumi",
    name: "Sumi",
    jp: "墨",
    mood: "ink stone at midnight",
    dark: true,
    art: "saturate(0.45) brightness(0.42) contrast(1.08)",
    colors: {
      paper: "#1c1d24",
      paper2: "#23252e",
      paper3: "#2c2f3a",
      ink: "#ebe7dd",
      inkSoft: "#9a978f",
      line: "#3b3f4c",
      accent: "#7fb6bd",
      accentText: "#7fb6bd",
      accent2: "#c4a1a8",
      wash: "#2a2f3b",
    },
  },
];

export const DEFAULT_THEME: ThemeId = "kinari";

export const THEME_BY_ID: Record<ThemeId, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
) as Record<ThemeId, Theme>;

/** Emits the CSS custom properties for a theme. Used both at runtime and SSR. */
export function themeVars(theme: Theme): Record<string, string> {
  const c = theme.colors;
  return {
    "--paper": c.paper,
    "--paper-2": c.paper2,
    "--paper-3": c.paper3,
    "--ink": c.ink,
    "--ink-soft": c.inkSoft,
    "--line": c.line,
    "--accent": c.accent,
    "--accent-text": c.accentText,
    // The focus ring is the single most important pixel for a keyboard user,
    // and the accent is the lowest-contrast colour in the palette. Ink.
    "--focus": c.ink,
    "--accent-2": c.accent2,
    "--wash": c.wash,
    "--art-grade": theme.art,
  };
}

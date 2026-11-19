/**
 * Builds everything the macOS app takes from the website.
 *
 * The Mac app is native SwiftUI, but it does not have its own copy of
 * anything the site already defines. This script is the one place the two
 * meet, and it writes four things into macos/Dhvani/Resources:
 *
 *   Engine/engine.js       the synthesis engine, bundled from src/native/bridge.ts
 *   Engine/index.html      the empty page the engine runs in
 *   Engine/catalogue.json  every sound, group, preset and paper
 *   Assets.xcassets        each doodle and the logo, as template vector art
 *
 * Run it after changing anything under src/audio, the catalogue, the themes
 * or the doodles:  npm run mac:assets
 */

import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = join(root, "macos/Dhvani/Resources");
const engineDir = join(res, "Engine");
const assets = join(res, "Assets.xcassets");

const define = {
  "process.env.NODE_ENV": '"production"',
  "process.env.NEXT_PUBLIC_BASE_PATH": '""',
};

await mkdir(engineDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* the engine                                                          */
/* ------------------------------------------------------------------ */

await build({
  entryPoints: [join(root, "src/native/bridge.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "safari17",
  minify: true,
  define,
  outfile: join(engineDir, "engine.js"),
  logLevel: "warning",
});

await writeFile(
  join(engineDir, "index.html"),
  `<!doctype html>
<html><head><meta charset="utf-8"><title>Dhvani engine</title></head>
<body><script src="engine.js"></script></body></html>
`,
);

/* ------------------------------------------------------------------ */
/* data and drawings, by running the site's own modules in node        */
/* ------------------------------------------------------------------ */

const work = join(tmpdir(), `dhvani-mac-${process.pid}`);
await mkdir(work, { recursive: true });
const entry = join(work, "entry.tsx");
const bundled = join(work, "entry.mjs");

await writeFile(
  entry,
  `
import { renderToStaticMarkup } from "react-dom/server";
import { GROUPS, SOUNDS, PRESETS } from "@/audio/catalogue";
import { THEMES, DEFAULT_THEME } from "@/lib/themes";
import { CREDITS } from "@/audio/credits";
import { DOODLES } from "@/components/doodles";

export const data = { groups: GROUPS, sounds: SOUNDS, presets: PRESETS, themes: THEMES, defaultTheme: DEFAULT_THEME, credits: CREDITS };

export function doodles() {
  return Object.fromEntries(
    Object.entries(DOODLES).map(([name, C]) => [name, renderToStaticMarkup(<C active={false} id={"mac-" + name} />)]),
  );
}
`,
);

await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  define,
  tsconfig: join(root, "tsconfig.json"),
  outfile: bundled,
  // Resolve react from this project, not from the temp directory.
  nodePaths: [join(root, "node_modules")],
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime"],
  logLevel: "warning",
});

// Externals resolve relative to the bundle, so put it where node_modules is.
const local = join(root, "node_modules/.cache/dhvani-mac-entry.mjs");
await mkdir(dirname(local), { recursive: true });
await writeFile(local, await readFile(bundled));
const mod = await import(pathToFileURL(local).href);
await rm(work, { recursive: true, force: true });

const { data } = mod;
const catalogue = {
  groups: data.groups,
  sounds: data.sounds.map((s) => ({
    id: s.id,
    name: s.name,
    jp: s.jp,
    group: s.group,
    doodle: s.doodle,
    kind: s.kind,
    defaultLevel: s.defaultLevel,
    note: s.note,
    credit: s.credit ?? null,
  })),
  presets: data.presets.map((p) => ({
    id: p.id,
    name: p.name,
    jp: p.jp,
    blurb: p.blurb,
    mix: p.mix,
    music: p.lofi?.on ? { mode: "lofi", level: p.lofi.level } : null,
    theme: p.theme ?? null,
  })),
  themes: data.themes.map((t) => ({ id: t.id, name: t.name, jp: t.jp, mood: t.mood, dark: t.dark, colors: t.colors })),
  defaultTheme: data.defaultTheme,
  credits: data.credits.map((c) => ({
    id: c.id,
    title: c.title,
    author: c.author,
    license: c.license,
    licenseUrl: c.licenseUrl,
    sourceUrl: c.sourceUrl,
  })),
};
await writeFile(join(engineDir, "catalogue.json"), JSON.stringify(catalogue, null, 1));

/* ------------------------------------------------------------------ */
/* vector art                                                          */
/* ------------------------------------------------------------------ */

/**
 * Turns a live doodle into a still, single-colour template image.
 *
 * On the site each line "boils" by cycling through three redrawn frames, and
 * a few parts animate. A menu bar has no business boiling, so only the first
 * frame is kept and the animations are dropped. Ink becomes black and the
 * accents become half-black, so that when SwiftUI tints the template with the
 * paper's ink the accents still read as a second, lighter colour.
 */
function still(svg) {
  return svg
    .replace(/<g class="boil-[12]"[^>]*>(?:<path[^>]*>(?:<\/path>)?)*<\/g>/g, "")
    .replace(/<animate(?:Transform)?[^>]*\/>/g, "")
    .replace(/<animate(?:Transform)?[^>]*>.*?<\/animate(?:Transform)?>/g, "")
    .replace(/ class="[^"]*"/g, "")
    .replace(/ style="[^"]*"/g, "")
    .replace(/(stroke|fill)="var\(--accent(?:-2)?\)"/g, '$1="#000" $1-opacity="0.55"')
    .replace(/(stroke|fill)="var\(--(?:ink|ink-soft)\)"/g, '$1="#000"')
    .replace(/(stroke|fill)="var\(--(?:paper|paper-2|paper-3|wash|line)\)"/g, '$1="none"')
    .replace(/var\(--[a-z0-9-]+\)/g, "#000")
    .replace(/viewBox="0 0 64 64"/, 'viewBox="-6 -6 76 76" width="76" height="76"')
    .replace(/ aria-hidden="true"/, ' xmlns="http://www.w3.org/2000/svg"');
}

const contents = (filename) =>
  JSON.stringify(
    {
      images: [{ filename, idiom: "universal" }],
      info: { author: "xcode", version: 1 },
      properties: { "preserves-vector-representation": true, "template-rendering-intent": "template" },
    },
    null,
    2,
  );

async function imageset(folder, name, svg) {
  const dir = join(folder, `${name}.imageset`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${name}.svg`), svg);
  await writeFile(join(dir, "Contents.json"), contents(`${name}.svg`));
}

const group = (dir) =>
  mkdir(dir, { recursive: true }).then(() =>
    writeFile(
      join(dir, "Contents.json"),
      JSON.stringify({ info: { author: "xcode", version: 1 }, properties: { "provides-namespace": true } }, null, 2),
    ),
  );

const doodleDir = join(assets, "Doodles");
await rm(doodleDir, { recursive: true, force: true });
await group(doodleDir);
const drawn = mod.doodles();
for (const [name, svg] of Object.entries(drawn)) await imageset(doodleDir, name, still(svg));

const logo = (await readFile(join(root, "public/brand/dhvani.svg"), "utf8")).replace(/currentColor/g, "#000");
await imageset(assets, "Logo", logo);

console.log(
  `engine, catalogue (${catalogue.sounds.length} sounds, ${catalogue.presets.length} presets) and ${Object.keys(drawn).length} doodles written to macos/Dhvani/Resources`,
);

"use client";

import { useContext } from "react";
import { Icon } from "./Icon";
import { ICON_PATHS, type IconName } from "./icons";
import { LiteContext } from "./Anim";

/**
 * One icon on a card.
 *
 * These used to be written by hand as SVG paths, by someone who cannot draw,
 * and it showed: they were legible but crude, and they carried about 270
 * independent SMIL timelines between them. They are now drawn properly,
 * traced to outlines, and given the same boiling line as the rest of the
 * interface. See scripts/trace-icons.mjs.
 *
 * `data-playing` lets the light tier animate only what you are actually
 * listening to.
 */
export function Doodle({ name, active }: { name: IconName; active: boolean; id?: string }) {
  const lite = useContext(LiteContext);
  void lite;
  return (
    <span data-playing={active ? "true" : "false"} className="block h-full w-full">
      <Icon name={name} active={active} />
    </span>
  );
}

export const DOODLE_NAMES = Object.keys(ICON_PATHS);

/**
 * Every icon as a component, keyed by name.
 *
 * The web app only ever needs `Doodle`, but the macOS app in `macos/` is a
 * second consumer of this module: `scripts/build-mac.mjs` renders each of
 * these to static markup, strips the boil down to one frame and ships them
 * as template images for the menu bar. Removing this export silently breaks
 * that build, which is exactly what happened once, so it is part of the
 * public surface of this file and not an accident.
 */
export const DOODLES: Record<string, React.FC<{ active: boolean; id?: string }>> =
  Object.fromEntries(
    (Object.keys(ICON_PATHS) as IconName[]).map((name) => [
      name,
      function DoodleIcon({ active }: { active: boolean; id?: string }) {
        return <Icon name={name} active={active} />;
      },
    ]),
  );

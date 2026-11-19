"use client";

import { useContext } from "react";
import { Icon } from "./Icon";
import { ICON_PATHS } from "./icons";
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
export function Doodle({ name, active }: { name: string; active: boolean; id?: string }) {
  const lite = useContext(LiteContext);
  void lite;
  return (
    <span data-playing={active ? "true" : "false"} className="block h-full w-full">
      <Icon name={name} active={active} />
    </span>
  );
}

export const DOODLE_NAMES = Object.keys(ICON_PATHS);

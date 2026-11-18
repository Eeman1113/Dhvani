"use client";

import { LiteContext } from "@/components/doodles/Anim";
import { useLite } from "@/lib/perf";

/**
 * Publishes the rendering tier to the whole tree.
 *
 * Read through context rather than a hook per element because the things
 * that need it are numerous: around 290 drawn shapes and 270 SMIL elements.
 * A subscription each would cost more than the drawing it is trying to save.
 */
export function LiteProvider({ children }: { children: React.ReactNode }) {
  const lite = useLite();
  return <LiteContext.Provider value={lite}>{children}</LiteContext.Provider>;
}

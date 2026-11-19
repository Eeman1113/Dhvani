"use client";

import { createContext } from "react";

/**
 * The rendering tier, published to the tree.
 *
 * Read through context rather than a hook per element because the things
 * that need it are numerous: every drawn border, every fader and every icon.
 * A subscription each would cost more than the drawing it is trying to save.
 */
export const LiteContext = createContext(false);

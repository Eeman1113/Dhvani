"use client";

import { createContext, useContext } from "react";

/**
 * SMIL, conditionally.
 *
 * The doodles contain around 270 `<animate>` and `<animateTransform>`
 * elements: rain falling, keycaps lighting up, a frog's throat inflating.
 * Each is an independent timeline the browser advances every frame, and SMIL
 * is not affected by `prefers-reduced-motion` or by any CSS rule, so it
 * cannot be switched off from the stylesheet.
 *
 * These wrappers render the real element in the full tier and nothing at all
 * in the light one. The drawing underneath is unchanged; it simply holds a
 * pose. Context rather than a hook per element, because there are hundreds of
 * them and a subscription each would cost more than it saves.
 */
export const LiteContext = createContext(false);

type AnimateProps = React.SVGProps<SVGAnimateElement>;
type AnimateTransformProps = React.SVGProps<SVGAnimateTransformElement>;

export function Anim(props: AnimateProps) {
  const lite = useContext(LiteContext);
  if (lite) return null;
  return <animate {...props} />;
}

export function AnimT(props: AnimateTransformProps) {
  const lite = useContext(LiteContext);
  if (lite) return null;
  return <animateTransform {...props} />;
}

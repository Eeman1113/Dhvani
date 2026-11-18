"use client";

import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";
import { useMotion } from "@/lib/useMotion";

/**
 * ध्वनि, the Sanskrit word for sound.
 *
 * Traced from the original felt-tip drawing rather than redrawn, so the
 * pressure changes and the slight waver in the shirorekha are the real ones.
 * It takes the ink colour of whatever theme is active and leans a little when
 * the mix gets loud.
 */
export function Logo({
  height = 64,
  reactive = true,
  className = "",
}: {
  height?: number;
  reactive?: boolean;
  className?: string;
}) {
  const ref = useMotion<SVGSVGElement>({
    active: reactive,
    band: "mid",
    lift: 4,
    scale: 0.035,
    tilt: 1.1,
    idle: reactive ? 1 : 0,
  });

  return (
    <svg
      ref={ref}
      viewBox={LOGO_VIEWBOX}
      style={{ height, width: (height * 809) / 553 }}
      className={`text-ink ${className}`}
      role="img"
      aria-label="Dhvani"
    >
      {/* evenodd, or the counters inside व and the loop of नि fill solid */}
      <path d={LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** The same mark, drawn on stroke by stroke. Used once, on first load. */
export function LogoDrawIn({ height = 110 }: { height?: number }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      style={{ height, width: (height * 809) / 553 }}
      className="text-ink"
      aria-hidden
    >
      <path
        d={LOGO_PATH}
        fill="currentColor"
        fillRule="evenodd"
        style={{
          clipPath: "inset(0 100% 0 0)",
          animation: "logoReveal 1.4s cubic-bezier(.4,0,.2,1) 0.15s forwards",
        }}
      />
    </svg>
  );
}

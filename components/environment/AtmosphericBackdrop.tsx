"use client";

/**
 * AtmosphericBackdrop — screen-fixed haze, horizon band, and vignette.
 *
 * Camera-fixed: this layer does not derive from travelDepth. Its only role
 * is to give the environment a recognizable spatial "stage" so the gates
 * and rails read as world geometry instead of floating outlines.
 *
 * All surfaces are pointer-events: none.
 */

import { useReducedMotion } from "@/hooks/useReducedMotion";

export function AtmosphericBackdrop(): React.JSX.Element {
  const reducedMotion = useReducedMotion();

  return (
    <div
      data-testid="environment-atmospheric-backdrop"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(40,45,60,0.18) 0%, rgba(15,17,24,0.0) 60%, rgba(0,0,0,0.0) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          top: "48%",
          height: "8%",
          background:
            "linear-gradient(to bottom, rgba(120,140,170,0.0) 0%, rgba(120,140,170,0.06) 50%, rgba(120,140,170,0.0) 100%)",
          filter: reducedMotion ? "none" : "blur(6px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 120px 40px rgba(0,0,0,0.55), inset 0 0 280px 80px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

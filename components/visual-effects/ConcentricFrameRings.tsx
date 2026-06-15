"use client";

/**
 * ConcentricFrameRings — presentational SVG for the light-theme framing-ring
 * background. Shared by both hosts:
 *   - ConcentricFrameField      (desktop rail): driven from travelDepth
 *   - ConcentricFrameFieldFlow  (mobile flow):  driven by GSAP ScrollTrigger
 *
 * It takes three MotionValues:
 *   - `convergence` (0 = loose / rolled-out, 1 = framed / rolled-in), and
 *   - `hw` / `hh`, the innermost frame's half-extents, which adapt per section.
 *
 * Each ring derives its rounded-square path from (hw, hh) and its scale +
 * rotation + opacity from convergence, all via MotionValues so updates stay off
 * the React render path (same technique as SceneFrame). The rings share one
 * shape, nested concentrically; the innermost settles as a square border around
 * the content. Geometry is centred on (0, 0) and placed at the viewport centre
 * with a static SVG translate, so transforms and the idle breathe pivot about
 * the centre. The breathe lives on the whole nest (one group) so every ring
 * "follows the same shape change" in unison.
 */

import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useMemo, useRef } from "react";

import {
  buildRings,
  FRAME_CENTER_X,
  FRAME_CENTER_Y,
  FRAME_VIEWBOX_HEIGHT,
  FRAME_VIEWBOX_WIDTH,
  ringOpacity,
  ringPath,
  ringRotation,
  ringScale,
  type RingSpec,
} from "@/lib/concentric-frame";

function Ring({
  spec,
  convergence,
  hw,
  hh,
}: {
  spec: RingSpec;
  convergence: MotionValue<number>;
  hw: MotionValue<number>;
  hh: MotionValue<number>;
}): React.JSX.Element {
  const scale = useTransform(convergence, (c) => ringScale(c, spec));
  const rotate = useTransform(convergence, (c) => ringRotation(c, spec));
  const opacity = useTransform(convergence, (c) => ringOpacity(c, spec));
  const d = useTransform([hw, hh], ([w, h]: number[]) => ringPath(w, h, spec));

  // `d` is a derived string MotionValue; write it straight to the attribute so
  // resizing the frame never triggers a React re-render.
  const pathRef = useRef<SVGPathElement>(null);
  useMotionValueEvent(d, "change", (next) => {
    pathRef.current?.setAttribute("d", next);
  });

  return (
    <motion.g
      style={{
        scale,
        rotate,
        opacity,
        transformBox: "fill-box",
        transformOrigin: "center",
      }}
    >
      <path
        ref={pathRef}
        d={d.get()}
        fill="none"
        stroke={spec.color}
        strokeWidth={spec.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>
  );
}

export function ConcentricFrameRings({
  convergence,
  hw,
  hh,
  drift,
}: {
  convergence: MotionValue<number>;
  hw: MotionValue<number>;
  hh: MotionValue<number>;
  /** Run the slow unified idle breathe. Off under reduced motion. */
  drift: boolean;
}): React.JSX.Element {
  const rings = useMemo(() => buildRings(), []);

  return (
    <div
      aria-hidden="true"
      data-testid="concentric-frame-field"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${FRAME_VIEWBOX_WIDTH} ${FRAME_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <g transform={`translate(${FRAME_CENTER_X} ${FRAME_CENTER_Y})`}>
          <g
            className={drift ? "frame-nest" : undefined}
            style={
              drift
                ? { transformBox: "fill-box", transformOrigin: "center" }
                : undefined
            }
          >
            {rings.map((spec, i) => (
              <Ring
                key={i}
                spec={spec}
                convergence={convergence}
                hw={hw}
                hh={hh}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}

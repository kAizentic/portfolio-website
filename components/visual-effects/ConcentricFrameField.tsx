"use client";

/**
 * ConcentricFrameField — desktop/rail host for the light-theme framing rings.
 *
 * Mounted *inside* <SpatialControllerProvider> so it can read the single
 * `travelDepth` MotionValue. From it we derive, via `useTransform` (exactly like
 * SceneFrame derives its visual properties — no second depth controller, no
 * native-scroll dependency, no per-frame React re-render):
 *   - `convergence`: how docked-in the nearest section is (drives the roll-in),
 *   - `hw` / `hh`: the innermost frame's half-extents, interpolated between the
 *     two sections the camera sits between so the frame hugs each section.
 *
 * Renders only in the light theme. Under reduced motion it holds a static framed
 * state (no idle breathe, no roll) but the frame size still tracks the section.
 */

import { useMotionValue, useTransform } from "motion/react";

import { ConcentricFrameRings } from "@/components/visual-effects/ConcentricFrameRings";
import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { useTheme } from "@/components/theme/theme";
import {
  convergenceFromDepth,
  frameSizeAtDepth,
} from "@/lib/concentric-frame";

export function ConcentricFrameField(): React.JSX.Element | null {
  const theme = useTheme();
  const {
    travelDepth,
    config,
    state: { reducedMotion },
  } = useSpatialController();
  const sceneGap = config.motion.sceneGap;

  const dynamicConvergence = useTransform(travelDepth, (d) =>
    convergenceFromDepth(d, sceneGap)
  );
  const staticFramed = useMotionValue(1);
  const hw = useTransform(travelDepth, (d) => frameSizeAtDepth(d, sceneGap).hw);
  const hh = useTransform(travelDepth, (d) => frameSizeAtDepth(d, sceneGap).hh);

  if (theme !== "light") return null;

  return (
    <ConcentricFrameRings
      convergence={reducedMotion ? staticFramed : dynamicConvergence}
      hw={hw}
      hh={hh}
      drift={!reducedMotion}
    />
  );
}

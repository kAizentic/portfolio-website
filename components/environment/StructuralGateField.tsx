"use client";

/**
 * StructuralGateField — repeating lightweight "gate" frames at gateSpacing.
 *
 * Each gate is a thin paired vertical line + horizontal lintel positioned in
 * world space by `translateZ(relativeDepth × pxPerDepthUnit)` so the camera
 * appears to pass through them. The visible set is recomputed when the
 * camera crosses a slot boundary (every gateSpacing depth units); per-frame
 * transform updates are driven by motion's useTransform so the React
 * reconciler is not involved per frame.
 *
 * All surfaces are pointer-events: none.
 */

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { environmentTokens } from "@/config/environment-tokens";
import { gateInstancesAtDepth } from "@/lib/environment-depth";
import type { EnvironmentInstance } from "@/types/environment";

interface GateFieldProps {
  /**
   * Recompute the visible set when the camera moves more than this many
   * depth units since the last refresh. Smaller = more updates, larger =
   * smoother but slightly delayed visible-set churn.
   */
  refreshThresholdDepth?: number;
}

export function StructuralGateField({
  refreshThresholdDepth = environmentTokens.gateSpacing / 4,
}: GateFieldProps): React.JSX.Element {
  const {
    config,
    loopLength,
    travelDepth,
    state: { reducedMotion },
  } = useSpatialController();
  const tokens = config.motion;

  const initial = useMemo<EnvironmentInstance[]>(
    () =>
      gateInstancesAtDepth(
        0,
        loopLength,
        environmentTokens.gateSpacing,
        environmentTokens.gateRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth
      ),
    [loopLength]
  );

  const [rawInstances, setRawInstances] =
    useState<EnvironmentInstance[]>(initial);
  const lastRefreshDepthRef = useRef<number>(0);

  useMotionValueEvent(travelDepth, "change", (depth) => {
    if (Math.abs(depth - lastRefreshDepthRef.current) < refreshThresholdDepth) {
      return;
    }
    lastRefreshDepthRef.current = depth;
    setRawInstances(
      gateInstancesAtDepth(
        depth,
        loopLength,
        environmentTokens.gateSpacing,
        environmentTokens.gateRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth
      )
    );
  });

  // Apply the visible-instance ceiling at render time so changes to
  // `reducedMotion` take effect immediately without waiting for the next
  // useMotionValueEvent tick.
  const maxVisible = reducedMotion
    ? environmentTokens.reduced.gateMaxVisibleInstances
    : environmentTokens.gateMaxVisibleInstances;
  const instances = rawInstances.slice(0, maxVisible);

  return (
    <div
      data-testid="environment-structural-gate-field"
      data-visible-count={instances.length}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        perspective: `${tokens.perspective}px`,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {instances.map((instance) => (
          <GateInstance
            key={instance.key}
            equivalentDepth={instance.equivalentDepth}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

function GateInstance({
  equivalentDepth,
  reducedMotion,
}: {
  equivalentDepth: number;
  reducedMotion: boolean;
}): React.JSX.Element {
  const { config, travelDepth } = useSpatialController();
  const tokens = config.motion;
  const fogStart = environmentTokens.fogStartDepth;
  const fogEnd = environmentTokens.fogEndDepth;
  const parallaxRatio = reducedMotion
    ? environmentTokens.reduced.parallaxTranslateRatio
    : 1;

  const translateZ = useTransform(travelDepth, (d) => {
    const rel = equivalentDepth - d;
    return rel * tokens.pxPerDepthUnit * parallaxRatio;
  });
  const opacity = useTransform(travelDepth, (d) => {
    const rel = Math.abs(equivalentDepth - d);
    if (rel <= fogStart) return 1;
    if (rel >= fogEnd) return 0;
    const t = (rel - fogStart) / (fogEnd - fogStart);
    const fog = t * t * (3 - 2 * t);
    return 1 - fog;
  });

  return (
    <motion.div
      data-testid="environment-gate"
      data-equivalent-depth={equivalentDepth}
      className="absolute inset-0 flex items-center justify-center"
      style={{
        translateZ,
        opacity,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
    >
      <div
        className="relative"
        style={{
          width: `${environmentTokens.gateLateralOffsetPx * 2}px`,
          height: "44vh",
          maxHeight: "420px",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, rgba(180,200,235,0.0) 0%, rgba(180,200,235,0.55) 22%, rgba(180,200,235,0.55) 78%, rgba(180,200,235,0.0) 100%)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, rgba(180,200,235,0.0) 0%, rgba(180,200,235,0.55) 22%, rgba(180,200,235,0.55) 78%, rgba(180,200,235,0.0) 100%)",
          }}
        />
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            top: "18%",
            background:
              "linear-gradient(to right, rgba(180,200,235,0.0), rgba(180,200,235,0.45) 50%, rgba(180,200,235,0.0))",
          }}
        />
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            bottom: "18%",
            background:
              "linear-gradient(to right, rgba(180,200,235,0.0), rgba(180,200,235,0.45) 50%, rgba(180,200,235,0.0))",
          }}
        />
      </div>
    </motion.div>
  );
}

"use client";

/**
 * DepthRailField — two longitudinal guide rails establishing the route axis.
 *
 * Implementation: repeating rail "tick" segments at railSegmentDepth so the
 * rail visibly moves past the camera. Identical wrap-continuity guarantees
 * as gates: the integer-divisibility invariant + half-loop render window
 * prevent visible substitution at the loop seam.
 *
 * All surfaces are pointer-events: none.
 */

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { environmentTokens } from "@/config/environment-tokens";
import { gateInstancesAtDepth } from "@/lib/environment-depth";
import type { EnvironmentInstance } from "@/types/environment";

export function DepthRailField(): React.JSX.Element {
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
        environmentTokens.railSegmentDepth,
        environmentTokens.railRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth,
        "rail"
      ),
    [loopLength]
  );

  const [instances, setInstances] = useState<EnvironmentInstance[]>(initial);
  const lastRefreshDepthRef = useRef<number>(0);
  const refreshThresholdDepth = environmentTokens.railSegmentDepth / 4;

  useMotionValueEvent(travelDepth, "change", (depth) => {
    if (Math.abs(depth - lastRefreshDepthRef.current) < refreshThresholdDepth) {
      return;
    }
    lastRefreshDepthRef.current = depth;
    setInstances(
      gateInstancesAtDepth(
        depth,
        loopLength,
        environmentTokens.railSegmentDepth,
        environmentTokens.railRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth,
        "rail"
      )
    );
  });

  return (
    <div
      data-testid="environment-depth-rail-field"
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
        {/* Continuous left/right longitudinal rails (camera-fixed lateral
            position, depth-driven via individual tick segments below). */}
        <div
          className="absolute"
          style={{
            top: "50%",
            left: `calc(50% - ${environmentTokens.parallaxRailOffsetPx}px)`,
            width: "1px",
            height: "1px",
          }}
        />
        {instances.map((instance) => (
          <RailTick
            key={instance.key}
            equivalentDepth={instance.equivalentDepth}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

function RailTick({
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
      data-testid="environment-rail-tick"
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
          width: `${environmentTokens.parallaxRailOffsetPx * 2}px`,
          height: "1px",
        }}
      >
        <div
          className="absolute left-0 top-0 h-px w-px"
          style={{ background: "rgba(140,160,195,0.45)" }}
        />
        <div
          className="absolute right-0 top-0 h-px w-px"
          style={{ background: "rgba(140,160,195,0.45)" }}
        />
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: "2px",
            background: "rgba(140,160,195,0.32)",
            transform: "translateY(-50%)",
            height: "2px",
          }}
        />
        <div
          className="absolute inset-y-0 right-0"
          style={{
            width: "2px",
            background: "rgba(140,160,195,0.32)",
            transform: "translateY(-50%)",
            height: "2px",
          }}
        />
      </div>
    </motion.div>
  );
}

"use client";

/**
 * EncounterThresholdField — one larger environmental threshold per anonymous
 * encounter anchor (01–06). Read as "the camera is approaching a location"
 * rather than "a card is about to be in focus". Identical wrap-continuity
 * math to gates; one instance per scene per loop.
 *
 * Interaction is unchanged: encounter focus / pointer-events still come
 * from `SceneFrame`; this field is purely environmental and non-interactive.
 */

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { environmentTokens } from "@/config/environment-tokens";
import { encounterThresholdInstances } from "@/lib/environment-depth";
import type { EnvironmentInstance } from "@/types/environment";

export function EncounterThresholdField(): React.JSX.Element {
  const {
    config,
    loopLength,
    travelDepth,
    state: { reducedMotion },
  } = useSpatialController();
  const tokens = config.motion;

  const initial = useMemo<EnvironmentInstance[]>(
    () =>
      encounterThresholdInstances(
        0,
        loopLength,
        tokens.sceneGap,
        config.scenes,
        environmentTokens.encounterThresholdRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth
      ),
    [config.scenes, loopLength, tokens.sceneGap]
  );

  const [instances, setInstances] = useState<EnvironmentInstance[]>(initial);
  const lastRefreshDepthRef = useRef<number>(0);
  const refreshThresholdDepth = tokens.sceneGap / 8;

  useMotionValueEvent(travelDepth, "change", (depth) => {
    if (Math.abs(depth - lastRefreshDepthRef.current) < refreshThresholdDepth) {
      return;
    }
    lastRefreshDepthRef.current = depth;
    setInstances(
      encounterThresholdInstances(
        depth,
        loopLength,
        tokens.sceneGap,
        config.scenes,
        environmentTokens.encounterThresholdRenderWindowDepth,
        environmentTokens.fogStartDepth,
        environmentTokens.fogEndDepth
      )
    );
  });

  return (
    <div
      data-testid="environment-encounter-threshold-field"
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
          <ThresholdInstance
            key={instance.key}
            equivalentDepth={instance.equivalentDepth}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

function ThresholdInstance({
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
      data-testid="environment-encounter-threshold"
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
          width: "min(76vmin, 720px)",
          height: "min(58vmin, 520px)",
        }}
      >
        <div
          className="absolute inset-0 rounded-[2px]"
          style={{
            border: "1px solid rgba(150,175,210,0.32)",
            boxShadow: "inset 0 0 60px rgba(60,80,110,0.18)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: 0,
            left: "-6px",
            width: "6px",
            height: "100%",
            background:
              "linear-gradient(to bottom, rgba(180,200,235,0.0), rgba(180,200,235,0.18) 50%, rgba(180,200,235,0.0))",
          }}
        />
        <div
          className="absolute"
          style={{
            top: 0,
            right: "-6px",
            width: "6px",
            height: "100%",
            background:
              "linear-gradient(to bottom, rgba(180,200,235,0.0), rgba(180,200,235,0.18) 50%, rgba(180,200,235,0.0))",
          }}
        />
      </div>
    </motion.div>
  );
}

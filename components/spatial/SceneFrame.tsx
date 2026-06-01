"use client";

/**
 * SceneFrame — pure motion transform shell for one encounter anchor.
 *
 * Rail-camera model:
 *   The frame is the encounter anchor's presentation surface. It does not
 *   know about content; it only knows its own anchor depth and reads the
 *   shared `travelDepth` MotionValue to compute its atmospheric falloff and
 *   parallax depth relative to the camera. Content is rendered through the
 *   injected slot `config.renderSceneContent(ctx)`.
 *
 * Implementation:
 *   - Every visible property is a derived MotionValue (via useTransform on
 *     the shared travelDepth). The reconciler is not involved per-frame.
 *   - A single useMotionValueEvent publishes an "encounter context"
 *     React state at ~30 fps so the injected content can render readable
 *     diagnostic values. When `showDiagnostics` is false, this publication
 *     is disabled and the throttle is skipped.
 *   - `pointer-events` is controlled by a MotionValue<string> bound to the
 *     element's style so it updates without a React re-render.
 */

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import {
  closestEquivalentAnchor,
  visualMapping,
  visualMappingReducedMotion,
} from "@/lib/depth-math";
import type { SceneManifestEntry, SceneRenderContext } from "@/types/spatial";

interface SceneFrameProps {
  scene: SceneManifestEntry;
}

export function SceneFrame({ scene }: SceneFrameProps): React.JSX.Element {
  const {
    config,
    loopLength,
    travelDepth,
    state: { focusedAnchorIndex, reducedMotion },
  } = useSpatialController();
  const tokens = config.motion;
  const baseAnchorDepth = scene.anchorIndex * tokens.sceneGap;

  const computeMapping = (depth: number) => {
    const eq = closestEquivalentAnchor(depth, baseAnchorDepth, loopLength);
    const rel = eq - depth;
    const mapping = reducedMotion
      ? visualMappingReducedMotion(rel, tokens)
      : visualMapping(rel, tokens);
    return { eq, rel, mapping };
  };

  const opacity = useTransform(travelDepth, (d) => computeMapping(d).mapping.opacity);
  const scale = useTransform(travelDepth, (d) => computeMapping(d).mapping.scale);
  const translateZ = useTransform(
    travelDepth,
    (d) => computeMapping(d).mapping.translateZ
  );
  const filter = useTransform(travelDepth, (d) => {
    const px = computeMapping(d).mapping.blurPx;
    return px <= 0.05 ? "none" : `blur(${px.toFixed(2)}px)`;
  });
  const pointerEvents = useTransform(
    travelDepth,
    (d) => computeMapping(d).mapping.pointerEvents
  );

  const focused = focusedAnchorIndex === scene.anchorIndex;

  // Throttled snapshot for the diagnostic content slot. Lives in React state
  // so the injected renderer (ScenePlaceholder) can read readable values.
  const lastPublishRef = useRef(0);
  const [renderCtx, setRenderCtx] = useState<SceneRenderContext>(() => {
    const initial = computeMapping(0);
    return {
      scene,
      baseAnchorDepth,
      equivalentAnchorDepth: initial.eq,
      relativeDepth: initial.rel,
      focused: scene.anchorIndex === 0,
      computed: initial.mapping,
    };
  });

  useMotionValueEvent(travelDepth, "change", (depth) => {
    if (!config.showDiagnostics && config.displayMode !== "diagnostic") {
      // Production / skeleton modes can skip the snapshot entirely.
      return;
    }
    const now = performance.now();
    if (now - lastPublishRef.current < 33) return;
    lastPublishRef.current = now;
    const { eq, rel, mapping } = computeMapping(depth);
    setRenderCtx({
      scene,
      baseAnchorDepth,
      equivalentAnchorDepth: eq,
      relativeDepth: rel,
      focused: focusedAnchorIndex === scene.anchorIndex,
      computed: mapping,
    });
  });

  // Keep the `focused` flag in renderCtx in sync with React state changes
  // even if travelDepth hasn't ticked since the last focus change.
  const renderCtxWithFocus = useMemo(
    () => ({ ...renderCtx, focused }),
    [renderCtx, focused]
  );

  return (
    <motion.div
      data-testid={`scene-frame-${scene.id}`}
      data-anchor-index={scene.anchorIndex}
      data-focused={focused ? "true" : "false"}
      className="absolute inset-0 flex items-center justify-center"
      style={{
        opacity,
        scale,
        translateZ,
        filter,
        pointerEvents,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity, filter",
      }}
    >
      {config.renderSceneContent(renderCtxWithFocus)}
    </motion.div>
  );
}

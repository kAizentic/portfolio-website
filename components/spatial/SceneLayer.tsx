"use client";

/**
 * SceneLayer — fixed encounter field (perspective container) hosting all
 * SceneFrame children. Hidden until the controller reports initialized so
 * the user never sees the camera at the physical document top.
 */

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { SceneFrame } from "@/components/spatial/SceneFrame";

export function SceneLayer(): React.JSX.Element | null {
  const {
    config,
    state: { initialized },
  } = useSpatialController();
  if (!initialized) return null;

  return (
    <div
      data-testid="scene-layer"
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        perspective: `${config.motion.perspective}px`,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {config.scenes.map((scene) => (
          <SceneFrame key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  );
}

"use client";

/**
 * ScrollSurface — an invisible spacer the height of the multi-cycle physical
 * rail. Its job is to give the document (and therefore Lenis) a stable scroll
 * range so the camera always has room to move forward or backward without
 * running into a physical boundary. Mounts unconditionally (even before
 * `initialized`) so the document height is stable from first paint.
 */

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";

export function ScrollSurface(): React.JSX.Element {
  const { totalHeightPx } = useSpatialController();
  return (
    <div
      data-testid="scroll-surface"
      aria-hidden="true"
      style={{ height: totalHeightPx }}
    />
  );
}

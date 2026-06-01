"use client";

import { SpatialViewport } from "@/components/spatial/SpatialViewport";
import { defaultSpatialConfig } from "@/config/spatial-config";

/**
 * Diagnostic prototype entry point.
 *
 * No content beyond the spatial viewport mounted with the default
 * (diagnostic) configuration. This is a *template* — future page types will
 * pass a different SpatialConfig with a different renderSceneContent and
 * (eventually) a different displayMode.
 */
export default function Page() {
  return <SpatialViewport config={defaultSpatialConfig} />;
}

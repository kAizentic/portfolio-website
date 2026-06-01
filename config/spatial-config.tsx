/**
 * Default SpatialConfig used by the diagnostic prototype.
 *
 * Future page types (skeleton, production) will compose their own
 * SpatialConfig with the same scenes + motion tokens but a different
 * `renderSceneContent` and `displayMode`. None of the motion or navigation
 * code reads display mode directly; visual surfaces just opt into the
 * relevant slot.
 */

import { ScenePlaceholder } from "@/components/scenes/ScenePlaceholder";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import type { SpatialConfig } from "@/types/spatial";

export const defaultSpatialConfig: SpatialConfig = {
  scenes: sceneManifest,
  motion: motionTokens,
  displayMode: "diagnostic",
  renderSceneContent: (ctx) => <ScenePlaceholder ctx={ctx} />,
  showDiagnostics: true,
  showStandardViewToggle: true,
};

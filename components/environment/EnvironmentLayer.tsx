"use client";

/**
 * EnvironmentLayer — top-level environmental depth-cue mount.
 *
 * Layer placement (between ScrollSurface and SceneLayer):
 *   AtmosphericBackdrop  → screen-fixed haze + vignette
 *   DepthRailField       → repeating world-space rail ticks
 *   StructuralGateField  → repeating world-space gates (gateSpacing)
 *   EncounterThresholdField → one threshold per anonymous anchor
 *
 * Reads camera depth from `useSpatialController().travelDepth` only. Does
 * not mutate controller state, does not register input handlers, does not
 * own scroll. Hidden until the controller reports initialized so the first
 * paint does not flash at the document top.
 *
 * Toggle off via <EnvironmentToggle /> — when disabled, the entire layer
 * unmounts (no residual DOM) so the comparison is identical-mechanics with
 * vs without environmental depth cues.
 */

import { AtmosphericBackdrop } from "@/components/environment/AtmosphericBackdrop";
import { DepthRailField } from "@/components/environment/DepthRailField";
import { EncounterThresholdField } from "@/components/environment/EncounterThresholdField";
import { useEnvironmentToggle } from "@/components/environment/EnvironmentContext";
import { StructuralGateField } from "@/components/environment/StructuralGateField";
import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { environmentTokens } from "@/config/environment-tokens";
import { assertEnvironmentTokensValid } from "@/lib/environment-depth";
import { useEffect } from "react";

export function EnvironmentLayer(): React.JSX.Element | null {
  const { enabled } = useEnvironmentToggle();
  const {
    loopLength,
    state: { initialized },
  } = useSpatialController();

  // Validate environment tokens against the live loop length once. Same
  // pattern as assertValidSpatialConfig in SpatialViewport.
  useEffect(() => {
    assertEnvironmentTokensValid(environmentTokens, loopLength);
  }, [loopLength]);

  if (!initialized) return null;
  if (!enabled) return null;

  return (
    <div
      data-testid="environment-layer"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    >
      <AtmosphericBackdrop />
      <DepthRailField />
      <StructuralGateField />
      <EncounterThresholdField />
    </div>
  );
}

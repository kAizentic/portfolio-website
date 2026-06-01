/**
 * Environmental depth-cue tokens (first bounded proof).
 *
 * Values are tuned for the existing rail (sceneGap = 1000, loopLength = 6000,
 * pxPerDepthUnit = 1.5, perspective = 1400, windowRadius = 1800):
 *
 *   gateSpacing 200            ⇒ 5 gates per scene gap; L/S = 30  ✓ I-E1
 *   gateRenderWindowDepth 1500 ⇒ < L/2 (3000)                     ✓ I-E2
 *   fogEndDepth 1400           ⇒ ≤ gateRenderWindowDepth − 100    ✓ I-E3
 *
 * Tweak with care — the matching invariants are unit-tested in
 * `lib/__tests__/environment-depth.test.ts`.
 */

import type { EnvironmentTokens } from "@/types/environment";

export const environmentTokens: EnvironmentTokens = {
  gateSpacing: 200,
  gateRenderWindowDepth: 1500,
  gateMaxVisibleInstances: 16,
  encounterThresholdRenderWindowDepth: 1800,
  railSegmentDepth: 200,
  railRenderWindowDepth: 1600,
  fogStartDepth: 600,
  fogEndDepth: 1400,
  parallaxRailOffsetPx: 360,
  gateLateralOffsetPx: 280,
  reduced: {
    parallaxTranslateRatio: 0,
    gateMaxVisibleInstances: 6,
  },
};

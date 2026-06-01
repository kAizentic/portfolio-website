/**
 * Pure content-passage math.
 *
 * `rel` (signed) = equivalentAnchorDepth − travelDepth. Forward camera motion
 * monotonically decreases `rel`: large positive → 0 → large negative.
 *
 *   incoming ramp:  rel ∈ (+dockedClarityZone, +incomingApproachRangeDepth]
 *                   easing of `t = (rel − dockedClarityZone) / approachRange`
 *                   from incoming.* at t=1 to incoming.*AtDock at t=0.
 *   docked stable:  |rel| ≤ dockedClarityZone → docked.* exactly.
 *   outgoing ramp:  rel ∈ [−outgoingPassageRangeDepth, −dockedClarityZone)
 *                   easing of `t = (−rel − dockedClarityZone) / passageRange`
 *                   from outgoing.AtDock at t=0 to outgoing.AtEnd at t=1.
 *
 * Reduced motion uses the `reduced.*` sub-tokens (tighter bands, no scale /
 * blur / rotation / lateral motion — opacity ramp only).
 */

import { clamp, lerp } from "@/lib/depth-math";
import type {
  ContentPassageIncomingTokens,
  ContentPassageMapping,
  ContentPassageOutgoingTokens,
  ContentPassagePhase,
  ContentPassageSecondaryTokens,
  ContentPassageTokens,
} from "@/types/content-passage";

const smoothstep = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

const easeOutCubic = (t: number): number => {
  const c = clamp(t, 0, 1);
  return 1 - (1 - c) ** 3;
};

const easeInCubic = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c * c;
};

export const classifyPhase = (
  rel: number,
  tokens: Pick<ContentPassageTokens, "dockedClarityZoneDepth">
): ContentPassagePhase => {
  const z = tokens.dockedClarityZoneDepth;
  if (Math.abs(rel) <= z) return "docked";
  return rel > 0 ? "incoming" : "outgoing";
};

interface ActiveBands {
  incomingRange: number;
  outgoingRange: number;
  incoming: ContentPassageIncomingTokens;
  outgoing: ContentPassageOutgoingTokens;
  secondary: ContentPassageSecondaryTokens;
}

const activeBandsFor = (
  tokens: ContentPassageTokens,
  reducedMotion: boolean
): ActiveBands => {
  if (reducedMotion) {
    return {
      incomingRange: tokens.reduced.incomingApproachRangeDepth,
      outgoingRange: tokens.reduced.outgoingPassageRangeDepth,
      incoming: tokens.reduced.incoming,
      outgoing: tokens.reduced.outgoing,
      secondary: tokens.reduced.secondary,
    };
  }
  return {
    incomingRange: tokens.incomingApproachRangeDepth,
    outgoingRange: tokens.outgoingPassageRangeDepth,
    incoming: tokens.incoming,
    outgoing: tokens.outgoing,
    secondary: tokens.secondary,
  };
};

/**
 * Continuous content-passage mapping for the camera's current signed
 * distance from this encounter's anchor.
 *
 * Asymmetric by construction: incoming caps at the docked values; outgoing
 * grows past them (scale > 1, opacity → 0). The dock value of every channel
 * is exactly `tokens.docked.*` so the curve is continuous at the boundary.
 */
export const contentMappingFromRel = (
  rel: number,
  tokens: ContentPassageTokens,
  reducedMotion: boolean
): ContentPassageMapping => {
  const bands = activeBandsFor(tokens, reducedMotion);
  const z = tokens.dockedClarityZoneDepth;
  const phase = classifyPhase(rel, tokens);

  if (phase === "docked") {
    return {
      phase,
      scale: tokens.docked.scale,
      opacity: tokens.docked.opacity,
      blurPx: tokens.docked.blurPx,
      rotateYDeg: bands.secondary.rotateYAtDockDeg,
      lateralPx: 0,
    };
  }

  if (phase === "incoming") {
    // t: 0 at the docked boundary, 1 at the far approach edge.
    const distanceFromDock = Math.max(0, rel - z);
    const tLinear = distanceFromDock / Math.max(1, bands.incomingRange);
    const tEased = clamp(tLinear, 0, 1);
    const scale = lerp(bands.incoming.scaleAtDock, bands.incoming.scaleStart, tEased);
    const opacity = lerp(
      bands.incoming.opacityAtDock,
      bands.incoming.opacityStart,
      smoothstep(tEased)
    );
    const blurPx = lerp(
      bands.incoming.blurAtDockPx,
      bands.incoming.blurStartPx,
      tEased
    );
    const rotateYDeg = lerp(
      bands.secondary.rotateYAtDockDeg,
      bands.secondary.rotateYAtIncomingStartDeg,
      tEased
    );
    const lateralPx = lerp(
      0,
      bands.secondary.lateralOffsetAtIncomingStartPx,
      tEased
    );
    return { phase, scale, opacity, blurPx, rotateYDeg, lateralPx };
  }

  // outgoing
  const distanceFromDock = Math.max(0, -rel - z);
  const tLinear = distanceFromDock / Math.max(1, bands.outgoingRange);
  const t = clamp(tLinear, 0, 1);
  const scale = lerp(
    bands.outgoing.scaleAtDock,
    bands.outgoing.scaleAtEnd,
    easeOutCubic(t)
  );
  const opacity = lerp(
    tokens.docked.opacity,
    bands.outgoing.opacityAtEnd,
    easeInCubic(t)
  );
  const blurPx = lerp(
    tokens.docked.blurPx,
    bands.outgoing.blurAtEndPx,
    easeOutCubic(t)
  );
  const rotateYDeg = lerp(
    bands.secondary.rotateYAtDockDeg,
    bands.secondary.rotateYAtOutgoingEndDeg,
    t
  );
  const lateralPx = lerp(
    0,
    bands.secondary.lateralOffsetAtOutgoingEndPx,
    t
  );
  return { phase: "outgoing", scale, opacity, blurPx, rotateYDeg, lateralPx };
};

/** Per-element stagger delay (seconds) for secondary effect chaining. */
export const elementStaggerSeconds = (
  elementIndex: number,
  tokens: ContentPassageTokens,
  reducedMotion: boolean
): number => {
  const bands = activeBandsFor(tokens, reducedMotion);
  return elementIndex * bands.secondary.headlineStaggerSeconds;
};

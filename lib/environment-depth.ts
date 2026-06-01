/**
 * Pure environment-depth math.
 *
 * Mirrors the equivalent-anchor / loop-continuity primitives from
 * `lib/depth-math.ts` so repeated environmental structures (rails, gates,
 * encounter thresholds) participate in the same circular world geometry as
 * the encounter anchors. No DOM, no motion, no controller dependency.
 *
 * Invariants (enforced by `assertEnvironmentTokensValid` and unit-tested):
 *   I-E1: loopLength % gateSpacing === 0
 *         (gates wrap continuously across the circular route boundary)
 *   I-E2: gateRenderWindowDepth < loopLength / 2
 *         (no opposite-side equivalent visible simultaneously)
 *   I-E3: fogEndDepth ≤ gateRenderWindowDepth - fadeMargin
 *         (wrap copy is fully fogged before entering the render window)
 */

import { closestEquivalentAnchor } from "@/lib/depth-math";
import type {
  EnvironmentInstance,
  EnvironmentTokens,
} from "@/types/environment";

export const DEFAULT_FADE_MARGIN_DEPTH = 60;

/** Smooth atmospheric clarity ∈ [0,1]: 1 at distance 0, 0 ≥ fogEnd. */
export const atmosphericClarity = (
  absRelativeDepth: number,
  fogStartDepth: number,
  fogEndDepth: number
): number => {
  if (absRelativeDepth <= fogStartDepth) return 1;
  if (absRelativeDepth >= fogEndDepth) return 0;
  const span = Math.max(1, fogEndDepth - fogStartDepth);
  const t = (absRelativeDepth - fogStartDepth) / span;
  // Smoothstep: 3t² − 2t³, then invert (clarity = 1 − fog amount).
  const fog = t * t * (3 - 2 * t);
  return 1 - fog;
};

/**
 * Pick the equivalent of `baseSlotDepth` whose absolute distance from the
 * camera is smallest on the looped rail, then test the cull window.
 *
 * Returns `null` outside the render window so emitters can stop accumulating.
 */
export const equivalentEnvironmentInstance = (
  travelDepth: number,
  baseSlotDepth: number,
  loopLength: number,
  renderWindowDepth: number,
  fogStartDepth: number,
  fogEndDepth: number,
  keyPrefix: string,
  slotIndex: number
): EnvironmentInstance | null => {
  const equivalent = closestEquivalentAnchor(
    travelDepth,
    baseSlotDepth,
    loopLength
  );
  const relativeDepth = equivalent - travelDepth;
  const absRel = Math.abs(relativeDepth);
  if (absRel >= renderWindowDepth) return null;
  const clarity = atmosphericClarity(absRel, fogStartDepth, fogEndDepth);
  return {
    key: `${keyPrefix}-${slotIndex}`,
    equivalentDepth: equivalent,
    relativeDepth,
    clarity,
  };
};

/**
 * Emit gate / rail-segment instances visible from the current camera depth.
 *
 * One emission per base slot; cull is per-slot (no opposite-side duplicates
 * because I-E2 guarantees only one equivalent of any slot can be inside the
 * render window at any time).
 */
export const gateInstancesAtDepth = (
  travelDepth: number,
  loopLength: number,
  spacing: number,
  renderWindowDepth: number,
  fogStartDepth: number,
  fogEndDepth: number,
  keyPrefix = "gate"
): EnvironmentInstance[] => {
  const count = Math.round(loopLength / spacing);
  const out: EnvironmentInstance[] = [];
  for (let i = 0; i < count; i++) {
    const baseSlotDepth = i * spacing;
    const instance = equivalentEnvironmentInstance(
      travelDepth,
      baseSlotDepth,
      loopLength,
      renderWindowDepth,
      fogStartDepth,
      fogEndDepth,
      keyPrefix,
      i
    );
    if (instance !== null) out.push(instance);
  }
  // Sort by relativeDepth so the painter draws far-to-near (back to front).
  out.sort((a, b) => Math.abs(b.relativeDepth) - Math.abs(a.relativeDepth));
  return out;
};

/**
 * Emit one encounter-threshold instance per anonymous anchor. Unlike gates,
 * the slot positions are anchorIndex * sceneGap and there are exactly N of
 * them per loop. Wrap behavior is identical (same closestEquivalentAnchor).
 */
export const encounterThresholdInstances = (
  travelDepth: number,
  loopLength: number,
  sceneGap: number,
  scenes: ReadonlyArray<{ anchorIndex: number; id: string }>,
  renderWindowDepth: number,
  fogStartDepth: number,
  fogEndDepth: number
): EnvironmentInstance[] => {
  const out: EnvironmentInstance[] = [];
  for (const scene of scenes) {
    const baseSlotDepth = scene.anchorIndex * sceneGap;
    const instance = equivalentEnvironmentInstance(
      travelDepth,
      baseSlotDepth,
      loopLength,
      renderWindowDepth,
      fogStartDepth,
      fogEndDepth,
      `threshold-${scene.id}`,
      scene.anchorIndex
    );
    if (instance !== null) out.push(instance);
  }
  out.sort((a, b) => Math.abs(b.relativeDepth) - Math.abs(a.relativeDepth));
  return out;
};

export interface EnvironmentValidation {
  ok: boolean;
  reasons: string[];
}

/**
 * Pure validator returning all violated invariants. The provider runs this
 * once at mount (dev) so token edits surface immediately instead of
 * shipping a silent wrap discontinuity to the visual review.
 */
export const validateEnvironmentTokens = (
  tokens: EnvironmentTokens,
  loopLength: number,
  fadeMarginDepth = DEFAULT_FADE_MARGIN_DEPTH
): EnvironmentValidation => {
  const reasons: string[] = [];

  if (
    !Number.isFinite(tokens.gateSpacing) ||
    tokens.gateSpacing <= 0 ||
    loopLength % tokens.gateSpacing !== 0
  ) {
    reasons.push(
      `I-E1 violated: loopLength (${loopLength}) is not an integer multiple of gateSpacing (${tokens.gateSpacing}).`
    );
  }

  if (tokens.gateRenderWindowDepth >= loopLength / 2) {
    reasons.push(
      `I-E2 violated: gateRenderWindowDepth (${tokens.gateRenderWindowDepth}) must be < loopLength/2 (${loopLength / 2}).`
    );
  }
  if (tokens.railRenderWindowDepth >= loopLength / 2) {
    reasons.push(
      `I-E2 violated: railRenderWindowDepth (${tokens.railRenderWindowDepth}) must be < loopLength/2 (${loopLength / 2}).`
    );
  }

  if (
    tokens.fogEndDepth >
    tokens.gateRenderWindowDepth - fadeMarginDepth
  ) {
    reasons.push(
      `I-E3 violated: fogEndDepth (${tokens.fogEndDepth}) must be ≤ gateRenderWindowDepth (${tokens.gateRenderWindowDepth}) − fadeMargin (${fadeMarginDepth}).`
    );
  }

  if (tokens.fogStartDepth >= tokens.fogEndDepth) {
    reasons.push(
      `fogStartDepth (${tokens.fogStartDepth}) must be < fogEndDepth (${tokens.fogEndDepth}).`
    );
  }

  if (
    !Number.isFinite(tokens.railSegmentDepth) ||
    tokens.railSegmentDepth <= 0
  ) {
    reasons.push(
      `railSegmentDepth (${tokens.railSegmentDepth}) must be a positive number.`
    );
  } else if (loopLength % tokens.railSegmentDepth !== 0) {
    reasons.push(
      `railSegmentDepth (${tokens.railSegmentDepth}) must divide loopLength (${loopLength}) evenly.`
    );
  }

  return { ok: reasons.length === 0, reasons };
};

/** Throwing form for development-time use; mirrors `assertValidSpatialConfig`. */
export const assertEnvironmentTokensValid = (
  tokens: EnvironmentTokens,
  loopLength: number,
  fadeMarginDepth = DEFAULT_FADE_MARGIN_DEPTH
): void => {
  const result = validateEnvironmentTokens(tokens, loopLength, fadeMarginDepth);
  if (!result.ok) {
    throw new Error(
      `[environment-tokens] Invalid configuration:\n  - ${result.reasons.join(
        "\n  - "
      )}`
    );
  }
};

/** Maximum theoretical visible-instance count from a render window + spacing. */
export const maxVisibleInstanceCount = (
  renderWindowDepth: number,
  spacing: number
): number => {
  if (spacing <= 0) return 0;
  return 2 * Math.ceil(renderWindowDepth / spacing);
};

/**
 * Configuration invariants for the spatial template.
 *
 * These are enforced once per SpatialViewport mount in development. They
 * exist to make impossible certain visible glitches that would otherwise be
 * legal at the type level:
 *
 *   I-1  windowRadius < loopLength / 2
 *        The equivalent-anchor representative flips at |rel| = L/2. Frames
 *        must already be fully invisible by then or the flip will show.
 *
 *   I-2  focusEpsilon < sceneGap / 2
 *        Keeps "in encounter zone" unique so pointer-events: auto can be
 *        granted to at most one frame at a time.
 *
 *   I-3  translateZAt.focus === 0
 *        sign(rel) flips at rel = 0; a nonzero focus depth would cause a
 *        discontinuous Z jump at the focal plane.
 *
 *   I-4  physical.physicalLoopCopies >= 5
 *        Minimum for a center cycle plus at least one safe cycle and one
 *        guard cycle on each side.
 *
 *   I-5  physical.initialPhysicalCycle > 0
 *        User must not begin at the physical document top.
 *
 *   I-6  physical.initialPhysicalCycle < physicalLoopCopies - 1
 *        User must not begin at the physical document bottom.
 */

import { loopLength } from "@/lib/depth-math";
import type { SpatialConfig } from "@/types/spatial";

export type ValidationIssue = {
  code: "I-1" | "I-2" | "I-3" | "I-4" | "I-5" | "I-6";
  message: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; issues: ValidationIssue[] };

export const validateSpatialConfig = (
  config: SpatialConfig
): ValidationResult => {
  const issues: ValidationIssue[] = [];
  const { motion, scenes } = config;
  const L = loopLength(scenes, motion.sceneGap);

  if (!(motion.windowRadius < L / 2)) {
    issues.push({
      code: "I-1",
      message: `windowRadius (${motion.windowRadius}) must be < loopLength / 2 (${L / 2}). The equivalent-anchor representative flips at |rel| = L/2; frames must be fully invisible before that flip.`,
    });
  }

  if (!(motion.focusEpsilon < motion.sceneGap / 2)) {
    issues.push({
      code: "I-2",
      message: `focusEpsilon (${motion.focusEpsilon}) must be < sceneGap / 2 (${motion.sceneGap / 2}). Otherwise more than one encounter could simultaneously claim pointer interaction.`,
    });
  }

  if (motion.translateZAt.focus !== 0) {
    issues.push({
      code: "I-3",
      message: `translateZAt.focus must equal 0 (got ${motion.translateZAt.focus}). sign(rel) flips at rel = 0 and any nonzero focus value would produce a discontinuous Z jump at the focal plane.`,
    });
  }

  if (!(motion.physical.physicalLoopCopies >= 5)) {
    issues.push({
      code: "I-4",
      message: `physical.physicalLoopCopies (${motion.physical.physicalLoopCopies}) must be >= 5 so a center cycle has at least one safe and one guard cycle on each side.`,
    });
  }

  if (!(motion.physical.initialPhysicalCycle > 0)) {
    issues.push({
      code: "I-5",
      message: `physical.initialPhysicalCycle (${motion.physical.initialPhysicalCycle}) must be > 0; the user must not begin at the physical document top.`,
    });
  }

  if (
    !(
      motion.physical.initialPhysicalCycle <
      motion.physical.physicalLoopCopies - 1
    )
  ) {
    issues.push({
      code: "I-6",
      message: `physical.initialPhysicalCycle (${motion.physical.initialPhysicalCycle}) must be < physicalLoopCopies - 1 (${motion.physical.physicalLoopCopies - 1}); the user must not begin at the physical document bottom.`,
    });
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
};

/**
 * Throws if the config is invalid; used at SpatialViewport mount.
 */
export const assertValidSpatialConfig = (config: SpatialConfig): void => {
  const result = validateSpatialConfig(config);
  if (result.valid) return;
  const lines = result.issues.map((i) => `  [${i.code}] ${i.message}`);
  throw new Error(
    `SpatialConfig validation failed:\n${lines.join("\n")}`
  );
};

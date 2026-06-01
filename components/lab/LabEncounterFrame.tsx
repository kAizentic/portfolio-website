"use client";

/**
 * LabEncounterFrame — minimal lab-only frame that hosts a SpatialShowcaseEncounter
 * at a fixed anchor depth and consumes a `simulatedTravelDepth` MotionValue.
 *
 * Architectural note: this is the lab's deliberate equivalent of `SceneFrame`,
 * but it does NOT apply the symmetric outer atmospheric/parallax transform.
 * Reasoning: the lab's purpose is to evaluate the asymmetric content-passage
 * curve in isolation, without prematurely committing to a reconciliation
 * model between the symmetric outer frame and the asymmetric content. Phase C
 * will resolve that choice based on what reads correctly in this lab.
 */

import { motion, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import type { MotionValue } from "motion/react";

import { SpatialShowcaseEncounter } from "@/components/encounters/SpatialShowcaseEncounter";

interface LabEncounterFrameProps {
  /** Simulated continuous camera depth shared across the lab. */
  simulatedTravelDepth: MotionValue<number>;
  /** Absolute anchor depth for this encounter (depth units). */
  anchorDepth: number;
  /** Display label (e.g. "01", "02"). */
  label: string;
  caption?: string;
  reducedMotion: boolean;
  /** Test id prefix so multiple encounters can be queried independently. */
  testIdPrefix: string;
}

export function LabEncounterFrame({
  simulatedTravelDepth,
  anchorDepth,
  label,
  caption,
  reducedMotion,
  testIdPrefix,
}: LabEncounterFrameProps): React.JSX.Element {
  // Sample `rel` into React state on every motion change. Uses
  // `useMotionValueEvent` which subscribes via `useInsertionEffect` —
  // identical pattern to the scrubber HUD, which is known to update reliably.
  const [rel, setRel] = useState<number>(anchorDepth - simulatedTravelDepth.get());

  useMotionValueEvent(simulatedTravelDepth, "change", (depth: number) => {
    setRel(anchorDepth - depth);
  });

  return (
    <motion.div
      data-testid={`lab-frame-${testIdPrefix}`}
      data-anchor-depth={anchorDepth}
      className="absolute inset-0 flex items-center justify-center"
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      <SpatialShowcaseEncounter
        label={label}
        caption={caption}
        rel={rel}
        reducedMotion={reducedMotion}
        testIdPrefix={testIdPrefix}
      />
    </motion.div>
  );
}

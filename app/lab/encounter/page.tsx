"use client";

/**
 * Encounter Choreography Lab — standalone developer route.
 *
 * Validates the asymmetric depth-passage curve across two adjacent encounter
 * compositions before any live integration. The lab does NOT mount the
 * spatial controller, Lenis, or the environment — it owns a single
 * `simulatedTravelDepth` MotionValue that two encounter frames consume.
 *
 * Visit `/lab/encounter` in dev.
 */

import { EncounterLabScrubber } from "@/components/lab/EncounterLabScrubber";

export default function EncounterLabPage(): React.JSX.Element {
  return <EncounterLabScrubber />;
}

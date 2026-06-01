/**
 * Phase 1 verification — menu travel logical target deltas via
 * closestEquivalentAnchor (same rule as controller travelTo).
 */

import { describe, expect, it } from "vitest";

import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import { closestEquivalentAnchor, loopLength } from "@/lib/depth-math";

const sceneGap = motionTokens.sceneGap;
const L = loopLength(sceneManifest, sceneGap);

const menuTargetDelta = (
  fromTravelDepth: number,
  toAnchorIndex: number
): number => {
  const base = toAnchorIndex * sceneGap;
  const target = closestEquivalentAnchor(fromTravelDepth, base, L);
  return target - fromTravelDepth;
};

describe("menu travel logical target deltas", () => {
  it("01 → 02: +1 × sceneGap", () => {
    expect(menuTargetDelta(0, 1)).toBe(sceneGap);
  });

  it("01 → 03: +2 × sceneGap", () => {
    expect(menuTargetDelta(0, 2)).toBe(2 * sceneGap);
  });

  it("01 → 06: -1 × sceneGap", () => {
    expect(menuTargetDelta(0, 5)).toBe(-sceneGap);
  });

  it("06 → 01: +1 × sceneGap from anchor 5 depth", () => {
    expect(menuTargetDelta(5 * sceneGap, 0)).toBe(sceneGap);
  });

  it("01 → 04: tie resolves via Math.round half toward +∞ (k=0 → +3 × sceneGap)", () => {
    // At travelDepth 0, base 3000: (0-3000)/L = -0.5 → Math.round → 0 (IEEE −0)
    expect(menuTargetDelta(0, 3)).toBe(3 * sceneGap);
    expect(Math.round((0 - 3 * sceneGap) / L)).toBeCloseTo(0, 10);
  });
});

import { describe, expect, it } from "vitest";

import {
  adjacentEncounterIndex,
  assistedDockTargetFromCommitment,
  departureRatioFromLastDock,
  returnToLastDockTarget,
} from "@/lib/depth-math";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";

const sceneGap = motionTokens.sceneGap;
const L = sceneManifest.length * sceneGap;
const scenes = sceneManifest;

describe("departureRatioFromLastDock", () => {
  it("is zero when camera sits on the docked equivalent", () => {
    expect(departureRatioFromLastDock(2000, 2, sceneGap, L)).toBeCloseTo(0, 6);
  });

  it("is positive when camera has moved forward from the dock", () => {
    expect(departureRatioFromLastDock(2220, 2, sceneGap, L)).toBeCloseTo(0.22, 6);
  });
});

describe("adjacentEncounterIndex", () => {
  it("wraps forward from scene 06 (index 5) to scene 01 (index 0)", () => {
    expect(adjacentEncounterIndex(5, 1, scenes.length)).toBe(0);
  });

  it("wraps backward from scene 01 (index 0) to scene 06 (index 5)", () => {
    expect(adjacentEncounterIndex(0, -1, scenes.length)).toBe(5);
  });
});

describe("assistedDockTargetFromCommitment", () => {
  it("commits forward to the next encounter from index 2", () => {
    const travelDepth = 2 * sceneGap + 0.25 * sceneGap;
    const target = assistedDockTargetFromCommitment(
      travelDepth,
      2,
      1,
      scenes,
      sceneGap,
      L
    );
    expect(target.anchorIndex).toBe(3);
    expect(target.equivalentAnchorDepth).toBeCloseTo(3 * sceneGap, 0);
  });

  it("commits backward to the previous encounter from index 2", () => {
    const travelDepth = 2 * sceneGap - 0.25 * sceneGap;
    const target = assistedDockTargetFromCommitment(
      travelDepth,
      2,
      -1,
      scenes,
      sceneGap,
      L
    );
    expect(target.anchorIndex).toBe(1);
    expect(target.equivalentAnchorDepth).toBeCloseTo(1 * sceneGap, 0);
  });

  it("commits forward across the loop boundary (06 → 01)", () => {
    const lastDocked = 5;
    const travelDepth = 5 * sceneGap + 0.3 * sceneGap;
    const target = assistedDockTargetFromCommitment(
      travelDepth,
      lastDocked,
      1,
      scenes,
      sceneGap,
      L
    );
    expect(target.anchorIndex).toBe(0);
    expect(target.equivalentAnchorDepth).toBeCloseTo(6 * sceneGap, 0);
  });

  it("commits backward across the loop boundary (01 → 06)", () => {
    const travelDepth = -0.3 * sceneGap;
    const target = assistedDockTargetFromCommitment(
      travelDepth,
      0,
      -1,
      scenes,
      sceneGap,
      L
    );
    expect(target.anchorIndex).toBe(5);
    expect(target.equivalentAnchorDepth).toBeCloseTo(-sceneGap, 0);
  });
});

describe("returnToLastDockTarget", () => {
  it("returns the equivalent of the last docked anchor", () => {
    const travelDepth = 2 * sceneGap + 0.1 * sceneGap;
    const target = returnToLastDockTarget(travelDepth, 2, sceneGap, L);
    expect(target.anchorIndex).toBe(2);
    expect(target.equivalentAnchorDepth).toBeCloseTo(2 * sceneGap, 0);
  });
});

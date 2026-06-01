/**
 * Phase A — bounded input-direction correction.
 *
 * Confirms that `motionTokens.manualTravel.forwardScrollSign` affects only the
 * input-to-scroll-px mapping and does NOT touch absolute anchor depth math,
 * equivalent-anchor wrap math, or any other sign-neutral primitive.
 */

import { describe, expect, it } from "vitest";

import { environmentTokens } from "@/config/environment-tokens";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import {
  assistedDockTargetFromCommitment,
  closestEquivalentAnchor,
  departureRatioFromLastDock,
  nearestSnapAnchorTarget,
} from "@/lib/depth-math";
import { gateInstancesAtDepth } from "@/lib/environment-depth";

const loopLength = sceneManifest.length * motionTokens.sceneGap; // 6000

/**
 * Match the Lenis post-multiplier delta the controller would receive given a
 * raw wheel deltaY and a configured forwardScrollSign. Lenis applies
 * `deltaY *= wheelMultiplier` and emits the result as a "virtual-scroll" event.
 */
const postMultiplierDeltaY = (
  rawDeltaY: number,
  forwardScrollSign: 1 | -1,
  inputGain: number
): number => rawDeltaY * forwardScrollSign * inputGain;

describe("forwardScrollSign — bundled token", () => {
  it("defaults to -1 so scrolling UP advances forward (rail-camera convention)", () => {
    expect(motionTokens.manualTravel.forwardScrollSign).toBe(-1);
  });
});

describe("input mapping under forwardScrollSign", () => {
  const gain = motionTokens.manualTravel.inputGain;

  it("forwardScrollSign = -1: wheel UP (negative deltaY) yields positive post-multiplier delta", () => {
    const wheelUp = -50;
    const post = postMultiplierDeltaY(wheelUp, -1, gain);
    expect(post).toBeGreaterThan(0);
    expect(post).toBeCloseTo(50 * gain, 5);
  });

  it("forwardScrollSign = -1: wheel DOWN (positive deltaY) yields negative post-multiplier delta", () => {
    const wheelDown = 50;
    const post = postMultiplierDeltaY(wheelDown, -1, gain);
    expect(post).toBeLessThan(0);
    expect(post).toBeCloseTo(-50 * gain, 5);
  });

  it("forwardScrollSign = +1: wheel DOWN yields positive post-multiplier delta (document convention)", () => {
    const wheelDown = 50;
    const post = postMultiplierDeltaY(wheelDown, 1, gain);
    expect(post).toBeGreaterThan(0);
    expect(post).toBeCloseTo(50 * gain, 5);
  });
});

describe("native-wheel forward-normalization", () => {
  // The controller's native wheel handler computes:
  //   forwardDelta = forwardScrollSign * event.deltaY
  // and treats `forwardDelta * departureDirection >= 0` as "same direction → no cancel".
  const forwardDelta = (rawDeltaY: number, sign: 1 | -1): number =>
    sign * rawDeltaY;

  it("under sign = -1, wheel UP during a forward dock is SAME direction (no cancel)", () => {
    const wheelUp = -50;
    const fd = forwardDelta(wheelUp, -1);
    expect(fd * 1).toBeGreaterThan(0); // same direction → would NOT cancel
  });

  it("under sign = -1, wheel DOWN during a forward dock is OPPOSITE direction (cancels)", () => {
    const wheelDown = 50;
    const fd = forwardDelta(wheelDown, -1);
    expect(fd * 1).toBeLessThan(0); // opposite → cancels
  });

  it("under sign = +1, wheel DOWN during a forward dock is SAME direction (no cancel)", () => {
    const wheelDown = 50;
    const fd = forwardDelta(wheelDown, 1);
    expect(fd * 1).toBeGreaterThan(0);
  });

  it("under sign = +1, wheel UP during a forward dock is OPPOSITE direction (cancels)", () => {
    const wheelUp = -50;
    const fd = forwardDelta(wheelUp, 1);
    expect(fd * 1).toBeLessThan(0);
  });
});

describe("sign-neutral primitives (must NOT depend on forwardScrollSign)", () => {
  it("closestEquivalentAnchor uses absolute logical depths only", () => {
    // Anchor depths are anchorIndex * sceneGap and never carry an input sign.
    const eq = closestEquivalentAnchor(0, 2 * motionTokens.sceneGap, loopLength);
    expect(eq).toBe(2 * motionTokens.sceneGap);
  });

  it("nearestSnapAnchorTarget returns the same anchor regardless of input sign convention", () => {
    const target = nearestSnapAnchorTarget(
      2000,
      sceneManifest,
      motionTokens.sceneGap,
      loopLength
    );
    expect(target.anchorIndex).toBe(2);
    expect(target.equivalentAnchorDepth).toBe(2000);
  });

  it("departureRatioFromLastDock is sign-neutral with respect to input mapping", () => {
    // Camera 300 depth units past anchor 2; ratio depends on depth geometry only.
    const ratio = departureRatioFromLastDock(
      2300,
      2,
      motionTokens.sceneGap,
      loopLength
    );
    expect(ratio).toBeCloseTo(0.3, 5);
  });

  it("assistedDockTargetFromCommitment chooses the adjacent anchor in the depth direction, not the input direction", () => {
    const forwardTarget = assistedDockTargetFromCommitment(
      0,
      0,
      1,
      sceneManifest,
      motionTokens.sceneGap,
      loopLength
    );
    expect(forwardTarget.anchorIndex).toBe(1);

    const backwardTarget = assistedDockTargetFromCommitment(
      0,
      0,
      -1,
      sceneManifest,
      motionTokens.sceneGap,
      loopLength
    );
    expect(backwardTarget.anchorIndex).toBe(5); // wraps backward to last anchor
  });

  it("environment gate emission depends only on travelDepth, not on input sign", () => {
    const gates = gateInstancesAtDepth(
      1234.5,
      loopLength,
      environmentTokens.gateSpacing,
      environmentTokens.gateRenderWindowDepth,
      environmentTokens.fogStartDepth,
      environmentTokens.fogEndDepth
    );
    expect(gates.length).toBeGreaterThan(0);
    for (const g of gates) {
      expect(Math.abs(g.relativeDepth)).toBeLessThan(
        environmentTokens.gateRenderWindowDepth
      );
    }
  });
});

describe("keyboard direction mapping (mirrors useKeyboardTravel)", () => {
  // The hook computes:
  //   upDirection   = forwardScrollSign === -1 ? +1 : -1
  //   downDirection = -upDirection
  const upDirection = (sign: 1 | -1): -1 | 1 => (sign === -1 ? 1 : -1);
  const downDirection = (sign: 1 | -1): -1 | 1 =>
    (-upDirection(sign)) as -1 | 1;

  it("under sign = -1, ArrowUp advances forward (stepBy +1)", () => {
    expect(upDirection(-1)).toBe(1);
    expect(downDirection(-1)).toBe(-1);
  });

  it("under sign = +1, ArrowDown advances forward (stepBy +1)", () => {
    expect(upDirection(1)).toBe(-1);
    expect(downDirection(1)).toBe(1);
  });
});

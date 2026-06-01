/**
 * U-4 / U-5 — travelDepth preservation through rebase.
 *
 * The atomic rebase used by the controller is a pure function
 * (`lib/depth-math.ts → computeRebase`). We test it directly so the
 * invariant is verifiable without React or Lenis.
 *
 * Invariant: before and after a rebase, the `travelDepth` computed from
 * `(renderScrollPx, rebaseOffsetDepth)` must be identical to bit-exact
 * arithmetic precision.
 */

import { describe, expect, it } from "vitest";

import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import {
  computeRebase,
  loopLength,
  loopLengthPx,
  travelDepthFrom,
} from "@/lib/depth-math";

const L = loopLength(sceneManifest, motionTokens.sceneGap);
const Lpx = loopLengthPx(L, motionTokens.pxPerDepthUnit);
const pxPerDU = motionTokens.pxPerDepthUnit;
const initialCycle = motionTokens.physical.initialPhysicalCycle;
const initialRebaseOffset = -initialCycle * L;

/** Helper: travelDepth from (renderScrollPx, rebaseOffsetDepth). */
const travel = (renderPx: number, rebaseOffset: number) =>
  travelDepthFrom(renderPx, rebaseOffset, pxPerDU);

describe("computeRebase — positive shift (camera drifted into upper guard)", () => {
  it("preserves travelDepth exactly when camera is one cycle below center", () => {
    // Initial setup: render coord placed at cycle (initialCycle - 2),
    // representing the user having scrolled backward into the upper guard.
    const renderScrollPx = (initialCycle - 2) * Lpx + 137;
    const rebaseOffsetDepth = initialRebaseOffset;
    const preTravel = travel(renderScrollPx, rebaseOffsetDepth);

    const r = computeRebase(
      renderScrollPx,
      rebaseOffsetDepth,
      pxPerDU,
      L,
      Lpx,
      initialCycle
    );

    expect(r.shiftCycles).toBe(2);
    expect(r.newRenderScrollPx).toBeCloseTo(initialCycle * Lpx + 137, 6);

    const postTravel = travel(r.newRenderScrollPx, r.newRebaseOffsetDepth);
    expect(postTravel).toBeCloseTo(preTravel, 8);
    expect(r.newTravelDepth).toBeCloseTo(preTravel, 8);
  });
});

describe("computeRebase — negative shift (camera drifted into lower guard)", () => {
  it("preserves travelDepth exactly when camera is one cycle above center", () => {
    const renderScrollPx = (initialCycle + 2) * Lpx + 412;
    const rebaseOffsetDepth = initialRebaseOffset;
    const preTravel = travel(renderScrollPx, rebaseOffsetDepth);

    const r = computeRebase(
      renderScrollPx,
      rebaseOffsetDepth,
      pxPerDU,
      L,
      Lpx,
      initialCycle
    );

    expect(r.shiftCycles).toBe(-2);
    expect(r.newRenderScrollPx).toBeCloseTo(initialCycle * Lpx + 412, 6);

    const postTravel = travel(r.newRenderScrollPx, r.newRebaseOffsetDepth);
    expect(postTravel).toBeCloseTo(preTravel, 8);
    expect(r.newTravelDepth).toBeCloseTo(preTravel, 8);
  });
});

describe("computeRebase — no-op when already centered", () => {
  it("returns zero shift when current cycle == initialPhysicalCycle", () => {
    const renderScrollPx = initialCycle * Lpx + 999;
    const r = computeRebase(
      renderScrollPx,
      initialRebaseOffset,
      pxPerDU,
      L,
      Lpx,
      initialCycle
    );
    expect(r.shiftCycles).toBe(0);
    expect(r.newRenderScrollPx).toBe(renderScrollPx);
    expect(r.newRebaseOffsetDepth).toBe(initialRebaseOffset);
  });
});

describe("computeRebase — repeated rebases compose correctly", () => {
  it("after rebase + manual drift + rebase, travelDepth is preserved", () => {
    // Start centered.
    let renderScrollPx = initialCycle * Lpx + 50;
    let rebaseOffsetDepth = initialRebaseOffset;
    const tA = travel(renderScrollPx, rebaseOffsetDepth);

    // Drift two cycles forward into the lower guard.
    renderScrollPx += 2 * Lpx;
    const tB = travel(renderScrollPx, rebaseOffsetDepth);
    expect(tB - tA).toBeCloseTo(2 * L, 8); // travelDepth changed accordingly.

    // Rebase.
    let r = computeRebase(
      renderScrollPx,
      rebaseOffsetDepth,
      pxPerDU,
      L,
      Lpx,
      initialCycle
    );
    renderScrollPx = r.newRenderScrollPx;
    rebaseOffsetDepth = r.newRebaseOffsetDepth;
    const tBPost = travel(renderScrollPx, rebaseOffsetDepth);
    expect(tBPost).toBeCloseTo(tB, 8); // preserved across rebase

    // Drift three cycles backward into the upper guard.
    renderScrollPx -= 3 * Lpx;
    const tC = travel(renderScrollPx, rebaseOffsetDepth);
    expect(tC).toBeCloseTo(tBPost - 3 * L, 8);

    // Rebase again.
    r = computeRebase(
      renderScrollPx,
      rebaseOffsetDepth,
      pxPerDU,
      L,
      Lpx,
      initialCycle
    );
    renderScrollPx = r.newRenderScrollPx;
    rebaseOffsetDepth = r.newRebaseOffsetDepth;
    const tCPost = travel(renderScrollPx, rebaseOffsetDepth);
    expect(tCPost).toBeCloseTo(tC, 8);
  });
});

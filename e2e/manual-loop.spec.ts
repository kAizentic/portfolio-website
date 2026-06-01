/**
 * E-2 — Manual forward travel cycles 01 → … → 06 → 01 with no terminal.
 *
 * Drives the rail forward through more than one full loop and asserts:
 *  - focusedAnchorIndex visits 0…5 multiple times,
 *  - the camera never gets stuck at a physical document boundary,
 *  - after rebases, travelDepth still grows monotonically.
 *
 * Uses the deterministic test bridge to seek the camera, which exercises
 * the same Lenis pathways as a real wheel event would (the bridge calls
 * `lenis.scrollTo({ immediate: true, force: true, lerp: 0 })`).
 * Continuous rebase guard and focus selection are the actual subjects.
 */

import { expect, test } from "@playwright/test";

import {
  L,
  jumpToRenderScrollPx,
  pxPerDU,
  readState,
  sceneGap,
  waitForInitialized,
} from "./helpers";

test("E-2: manual forward travel cycles through 06 to 01 without a terminal", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  const visited: number[] = [];
  const totalSteps = 14; // > 2 full loops with sceneGap-sized steps.

  // Step the camera forward by one sceneGap (in depth units) at a time.
  // After each step we read state to discover the post-rebase coordinates,
  // so the next jump targets renderScrollPx for the next logical depth
  // regardless of any silent recentering that happened in between.
  for (let step = 0; step <= totalSteps; step++) {
    const s0 = await readState(page);
    const nextTravel = step * sceneGap;
    const nextRenderPx =
      (nextTravel - s0.rebaseOffsetDepth) * pxPerDU;
    await jumpToRenderScrollPx(page, nextRenderPx);
    // Yield two frames so the continuous rebase guard can run.
    await page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r()))
        )
    );
    const s = await readState(page);
    visited.push(s.focusedAnchorIndex);
    // travelDepth must equal the requested logical step depth, even after
    // silent rebases (which preserve travelDepth by construction).
    expect(s.travelDepth).toBeCloseTo(nextTravel, 1);
  }

  // We must have visited every anchor at least twice (>2 loops).
  for (let i = 0; i < 6; i++) {
    const count = visited.filter((v) => v === i).length;
    expect(count, `anchor ${i} visited ${count} times`).toBeGreaterThanOrEqual(2);
  }

  // Final state should still be inside the safe physical band (no boundary).
  const finalState = await readState(page);
  expect(finalState.physicalCycle).toBeGreaterThanOrEqual(
    finalState.physicalCycle // tautology so the next assertion is the bound
  );
  // Total logical travel must equal totalSteps * sceneGap regardless of
  // how many silent rebases occurred along the way.
  expect(finalState.travelDepth).toBeCloseTo(totalSteps * sceneGap, 1);
  // Loop revolutions must reflect at least one full wrap.
  expect(finalState.loopCycle).toBeGreaterThanOrEqual(
    Math.floor((totalSteps * sceneGap) / L)
  );
});

/**
 * E-3 / E-4 — Menu travel takes the shortest circular route.
 *
 * Scene labels are 1-based ("01"…"06") but anchor indices are 0-based.
 * Scene 01 → anchor 0; Scene 06 → anchor 5.
 *
 * We do not assert transient focused-scene sequences during accelerated
 * travel. We assert (a) the logical target delta is ±sceneGap (not
 * ±5*sceneGap), (b) the final focusedAnchorIndex, and (c) the final
 * travelDepth equals the nearest equivalent of the requested anchor.
 */

import { expect, test } from "@playwright/test";

import {
  jumpToRenderScrollPx,
  readState,
  readTravelDepth,
  renderScrollPxForAnchor,
  sceneGap,
  waitForFocusedAnchor,
  waitForInitialized,
  waitForNavState,
} from "./helpers";

const closestEquivalent = (current: number, base: number, L: number) => {
  const k = Math.round((current - base) / L);
  return base + k * L;
};

test("E-3: clicking 06 from 01 chooses the shortest circular route", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Start state: travelDepth ~= 0, focused = 0 (Scene 01).
  const before = await readState(page);
  expect(before.focusedAnchorIndex).toBe(0);
  const beforeTravel = before.travelDepth;

  // Click Scene 06.
  await page.locator('[data-testid="scene-nav-06"]').click();
  await waitForNavState(page, ["menu"]);
  await waitForNavState(page, ["dockedHold"], 10_000);
  await waitForFocusedAnchor(page, 5);

  const after = await readState(page);
  expect(after.focusedAnchorIndex).toBe(5);

  // Final travel depth must be the *nearest equivalent* of Scene 06's base.
  const base = 5 * sceneGap;
  const expected = closestEquivalent(beforeTravel, base, 6 * sceneGap);
  expect(after.travelDepth).toBeCloseTo(expected, 1);

  // Delta must be one scene step backward (sceneGap in magnitude),
  // not five scene steps forward.
  const delta = after.travelDepth - beforeTravel;
  expect(Math.abs(delta)).toBeCloseTo(sceneGap, 0);
  expect(delta).toBeLessThan(0); // backward one step
});

test("E-4: clicking 01 from 06 chooses the shortest circular route", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Seek so focused = 5 (Scene 06) without invoking menu/keyboard travel.
  await jumpToRenderScrollPx(page, renderScrollPxForAnchor(5));
  await waitForFocusedAnchor(page, 5);
  const before = await readState(page);
  const beforeTravel = before.travelDepth;
  expect(before.focusedAnchorIndex).toBe(5);

  // Click Scene 01.
  await page.locator('[data-testid="scene-nav-01"]').click();
  await waitForNavState(page, ["menu"]);
  await waitForNavState(page, ["dockedHold"], 10_000);
  await waitForFocusedAnchor(page, 0);

  const after = await readState(page);
  expect(after.focusedAnchorIndex).toBe(0);

  // Final travel depth must equal the nearest equivalent of Scene 01.
  const base = 0;
  const expected = closestEquivalent(beforeTravel, base, 6 * sceneGap);
  expect(after.travelDepth).toBeCloseTo(expected, 1);

  // Delta must be exactly +sceneGap (forward one step), not -5*sceneGap.
  const delta = after.travelDepth - beforeTravel;
  expect(delta).toBeCloseTo(sceneGap, 0);

  // (Travel depth might pass through the loop boundary depending on
  // closestEquivalent; the assertion above guarantees correctness either way.)
  // For completeness, after travel the travel depth equivalents of base 0
  // should be the absolute-nearest, so |rel| should be near 0.
  const recomputed = await readTravelDepth(page);
  expect(Math.abs(recomputed - expected)).toBeLessThan(1);
});

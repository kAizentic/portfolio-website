/**
 * Assisted directional manual docking.
 */

import { expect, test } from "@playwright/test";

import {
  readState,
  sceneGap,
  waitForFocusedAnchor,
  waitForHoldGatesOpen,
  waitForInitialized,
  waitForNavState,
  wheelBackward,
  wheelCommitFromDock,
  wheelPastDepartureBuffer,
} from "./helpers";

test("below commit threshold returns gently to current dock", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForNavState(page, ["dockedHold"]);

  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);

  await page.mouse.move(640, 400);
  await waitForHoldGatesOpen(page);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 18);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(500);

  await waitForNavState(page, ["dockedHold"], 10_000);
  const s = await readState(page);
  expect(s.focusedAnchorIndex).toBe(2);
  expect(s.travelDepth).toBeCloseTo(2 * sceneGap, 0);
});

test("forward movement beyond threshold commits to next anchor", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);

  await wheelCommitFromDock(page, 200, 3);

  const s = await readState(page);
  expect(s.lastDockedAnchorIndex).toBe(3);
  expect(s.focusedAnchorIndex).toBe(3);
});

test("backward movement beyond threshold commits to previous anchor", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);

  await wheelCommitFromDock(page, 220, 1, -1);

  const s = await readState(page);
  expect(s.lastDockedAnchorIndex).toBe(1);
  expect(s.focusedAnchorIndex).toBe(1);
});

test("assisted forward from scene 06 docks at scene 01", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-06"]').click();
  await waitForNavState(page, ["dockedHold"], 15_000);
  await waitForFocusedAnchor(page, 5);

  await wheelCommitFromDock(page, 200, 0);

  expect((await readState(page)).focusedAnchorIndex).toBe(0);
});

test("assisted backward from scene 01 docks at scene 06", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await waitForNavState(page, ["dockedHold"]);

  await wheelCommitFromDock(page, 220, 5, -1);

  expect((await readState(page)).focusedAnchorIndex).toBe(5);
});

test("opposite-direction input cancels assisted docking", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);
  await wheelPastDepartureBuffer(page, 220);
  await waitForNavState(page, ["snapping"], 6_000);
  const mid = await readState(page);
  expect(mid.navigationState).toBe("snapping");

  // Dock is forward (anchor 2 → 3); opposite cancel = backward input.
  await wheelBackward(page, 400);
  await waitForNavState(page, ["manual"], 4_000);

  const after = await readState(page);
  expect(after.committedDockTargetIndex).toBeNull();
  expect(after.manualDockPending).toBe(true);
});

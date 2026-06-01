/**
 * Opposite-direction manual input cancels assisted docking mid-arrival.
 */

import { expect, test } from "@playwright/test";

import {
  readState,
  waitForFocusedAnchor,
  waitForInitialized,
  waitForNavState,
  wheelBackward,
  wheelPastDepartureBuffer,
} from "./helpers";

test("opposite wheel during assisted docking returns to free camera", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);
  await wheelPastDepartureBuffer(page, 220);
  await waitForNavState(page, ["snapping"], 6_000);
  const beforeCancel = await readState(page);
  expect(beforeCancel.navigationState).toBe("snapping");
  // Dock is forward (anchor 2 → 3); opposite cancel = backward input.
  await wheelBackward(page, 500);
  await waitForNavState(page, ["manual"], 4_000);

  const afterCancel = await readState(page);
  expect(afterCancel.navigationState).toBe("manual");
  expect(afterCancel.committedDockTargetIndex).toBeNull();
  expect(afterCancel.manualDockPending).toBe(true);
});

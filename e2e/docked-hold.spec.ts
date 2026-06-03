/**
 * Post-arrival docked hold — landing stability and departure buffer.
 */

import { expect, test } from "@playwright/test";

import {
  departureBufferThresholdPx,
  readState,
  waitForFocusedAnchor,
  waitForHoldGatesOpen,
  waitForInitialized,
  waitForNavState,
  wheelBackward,
  wheelCommitFromDock,
  wheelForward,
} from "./helpers";

const waitForDockedHold = (
  page: import("@playwright/test").Page,
  timeoutMs = 15_000
) => waitForNavState(page, ["dockedHold"], timeoutMs);

test("assisted manual docking enters docked hold at exact arrival", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);
  await wheelCommitFromDock(page, 220, 3);

  expect((await readState(page)).navigationState).toBe("dockedHold");
});

test("menu travel arrival enters docked hold", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);

  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);

  const s = await readState(page);
  expect(s.navigationState).toBe("dockedHold");
});

test("keyboard travel arrival enters docked hold", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);

  // ArrowDown is the forward key under the document convention
  // (motion.manualTravel.forwardScrollSign === +1).
  await page.keyboard.press("ArrowDown");
  await waitForNavState(page, ["dockedHold"], 15_000);

  const s = await readState(page);
  expect(s.focusedAnchorIndex).toBe(1);
});

test("arrival remains pinned during minimum hold", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-02"]').click();
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __rail?: {
          state: () => {
            navigationState: string;
            holdRemainingSeconds: number;
          };
        };
      };
      const s = w.__rail?.state();
      return (
        s?.navigationState === "dockedHold" &&
        (s.holdRemainingSeconds ?? 0) > 0.05
      );
    },
    null,
    { timeout: 15_000 }
  );

  const before = await readState(page);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 18);
  await page.waitForTimeout(40);

  const during = await readState(page);
  expect(during.navigationState).toBe("dockedHold");
  expect(during.travelDepth).toBeCloseTo(before.travelDepth, 0);
  expect(Math.abs(during.departureBufferPx)).toBeLessThan(
    departureBufferThresholdPx
  );
});

test("residual input during hold does not cause departure", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);

  const before = await readState(page);
  const anchorDepth = before.travelDepth;

  await page.mouse.move(640, 400);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(25);
  }

  const after = await readState(page);
  expect(after.navigationState).toBe("dockedHold");
  expect(after.travelDepth).toBeCloseTo(anchorDepth, 0);
});

test("deliberate scroll below departure-buffer threshold leaves camera pinned", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);
  await waitForHoldGatesOpen(page);

  const before = await readState(page);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 50);
  await page.mouse.wheel(0, 50);
  await page.waitForTimeout(60);

  const after = await readState(page);
  expect(after.navigationState).toBe("dockedHold");
  expect(Math.abs(after.departureBufferPx)).toBeLessThan(
    departureBufferThresholdPx
  );
  expect(after.travelDepth).toBeCloseTo(before.travelDepth, 0);
});

test("accumulated deliberate scroll beyond threshold releases in correct direction", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);
  await waitForHoldGatesOpen(page);

  await page.mouse.move(640, 400);
  await wheelForward(page, 200);

  await waitForNavState(page, ["snapping", "manual"], 5_000);
  const after = await readState(page);
  expect(after.departureDirection).toBe(1);
});

test("reversed input during buffer accumulation does not release in original direction", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await page.locator('[data-testid="scene-nav-03"]').click();
  await waitForFocusedAnchor(page, 2, 15_000);
  await waitForNavState(page, ["dockedHold"], 15_000);
  await waitForHoldGatesOpen(page);

  await page.mouse.move(640, 400);
  await wheelForward(page, 55);
  await wheelForward(page, 55);
  const mid = await readState(page);
  expect(mid.navigationState).toBe("dockedHold");
  expect(Math.abs(mid.departureBufferPx)).toBeLessThan(
    departureBufferThresholdPx
  );

  await wheelBackward(page, 220);
  await waitForNavState(page, ["snapping", "manual"], 5_000);
  const after = await readState(page);
  // anchor 3 = forward neighbor of anchor 2; we reversed away from it.
  expect(after.committedDockTargetIndex).not.toBe(3);
  expect(after.focusedAnchorIndex).not.toBe(3);
});

test("continuous forward scroll progresses through multiple anchors with resistance", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);
  await waitForFocusedAnchor(page, 0);

  await page.mouse.move(640, 400);
  await wheelCommitFromDock(page, 220, 1);
  await wheelCommitFromDock(page, 220, 2);
});

test("loop-boundary assisted docking holds at Scene 01 and Scene 06", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForInitialized(page);

  await page.locator('[data-testid="scene-nav-06"]').click();
  await waitForNavState(page, ["dockedHold"], 15_000);
  await waitForFocusedAnchor(page, 5);
  await wheelCommitFromDock(page, 220, 0);

  await page.locator('[data-testid="scene-nav-01"]').click();
  await waitForNavState(page, ["dockedHold"], 15_000);
  await waitForFocusedAnchor(page, 0);
  await wheelCommitFromDock(page, 220, 5, -1);
});

test("reduced-motion arrival stays functional with brief hold", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForInitialized(page);
  await waitForDockedHold(page);

  await page.locator('[data-testid="scene-nav-02"]').click();
  await waitForNavState(page, ["dockedHold"], 15_000);

  await waitForHoldGatesOpen(page);
  await page.mouse.move(640, 400);
  await wheelForward(page, 80);
  await waitForNavState(page, ["snapping", "manual"], 5_000);
});

/**
 * Environmental depth-cue proof — toggle, non-interactivity, loop continuity,
 * reduced motion, and controller-isolation guarantees.
 *
 * The environment layer must:
 *   1. Mount only after the controller is initialized (no flash).
 *   2. Be fully pointer-events: none across all its surfaces.
 *   3. Disappear cleanly when toggled OFF; reappear when toggled ON.
 *   4. Not change controller / camera state when toggled.
 *   5. Emit gates and encounter thresholds that wrap continuously across
 *      the circular route boundary (no visible substitution).
 *   6. Respect prefers-reduced-motion (lower visible-instance budget).
 */

import { expect, test } from "@playwright/test";

import {
  initialScrollPx,
  jumpToRenderScrollPx,
  readState,
  setReducedMotion,
  waitForInitialized,
} from "./helpers";

const ENV_LAYER = '[data-testid="environment-layer"]';
const GATE_FIELD = '[data-testid="environment-structural-gate-field"]';
const THRESHOLD_FIELD =
  '[data-testid="environment-encounter-threshold-field"]';
const ENV_TOGGLE = '[data-testid="environment-toggle"]';

test("environment layer mounts after initialization with the toggle on", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  await expect(page.locator(ENV_LAYER)).toBeVisible();
  await expect(page.locator(GATE_FIELD)).toBeVisible();
  await expect(page.locator(THRESHOLD_FIELD)).toBeVisible();
  await expect(page.locator(ENV_TOGGLE)).toBeVisible();
  await expect(page.locator(ENV_TOGGLE)).toHaveAttribute(
    "data-environment-enabled",
    "true"
  );
});

test("environment surfaces are non-interactive (pointer-events: none)", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  const allNone = await page.evaluate(() => {
    const surfaces = document.querySelectorAll<HTMLElement>(
      "[data-testid^='environment-']"
    );
    // Exclude the toggle button itself (it must be clickable).
    let problem: { testid: string | null; pointerEvents: string } | null = null;
    surfaces.forEach((el) => {
      const testid = el.getAttribute("data-testid");
      if (testid === "environment-toggle") return;
      const pe = window.getComputedStyle(el).pointerEvents;
      if (pe !== "none" && problem === null) {
        problem = { testid, pointerEvents: pe };
      }
    });
    return problem;
  });
  expect(allNone).toBeNull();
});

test("environment toggle removes the layer without changing controller state", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  const beforeState = await readState(page);

  await page.locator(ENV_TOGGLE).click();
  // Layer should unmount.
  await expect(page.locator(ENV_LAYER)).toHaveCount(0);
  await expect(page.locator(ENV_TOGGLE)).toHaveAttribute(
    "data-environment-enabled",
    "false"
  );

  const afterState = await readState(page);
  expect(afterState.travelDepth).toBeCloseTo(beforeState.travelDepth, 4);
  expect(afterState.renderScrollPx).toBeCloseTo(
    beforeState.renderScrollPx,
    4
  );
  expect(afterState.focusedAnchorIndex).toBe(beforeState.focusedAnchorIndex);
  expect(afterState.navigationState).toBe(beforeState.navigationState);

  // Toggle back on and confirm it re-mounts.
  await page.locator(ENV_TOGGLE).click();
  await expect(page.locator(ENV_LAYER)).toBeVisible();
  await expect(page.locator(ENV_TOGGLE)).toHaveAttribute(
    "data-environment-enabled",
    "true"
  );
});

test("gate visible count stays bounded across the loop", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Sample at many positions across one full loop and assert the
  // visible-count attribute never exceeds the theoretical maximum (16 by
  // configuration). Implicitly verifies no double-visible wrap copies.
  const stride = 0.13 * 1000; // depth units per sample (sceneGap = 1000)
  const samplesPerLoop = Math.ceil(6000 / stride);
  for (let i = 0; i < samplesPerLoop; i++) {
    // initialScrollPx is the central-cycle position; nudge by i * stride
    // in physical px so we sweep continuously.
    const px = initialScrollPx + i * stride * 1.5;
    await jumpToRenderScrollPx(page, px);
    const count = await page.evaluate(
      (sel) => {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? Number(el.getAttribute("data-visible-count") ?? "0") : 0;
      },
      GATE_FIELD
    );
    expect(count).toBeLessThanOrEqual(16);
    expect(count).toBeGreaterThan(0);
  }
});

test("encounter threshold field places a threshold at every anchor", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Sample at each anchor and confirm at least one threshold instance is
  // visible per sample (the focused-anchor instance must always be there).
  for (let anchor = 0; anchor < 6; anchor++) {
    const px = initialScrollPx + anchor * 1000 * 1.5;
    await jumpToRenderScrollPx(page, px);
    const count = await page.evaluate(
      (sel) => {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? Number(el.getAttribute("data-visible-count") ?? "0") : 0;
      },
      THRESHOLD_FIELD
    );
    expect(count).toBeGreaterThan(0);
  }
});

test("loop boundary keeps environment visible without discontinuity", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Sample just before and after the physical loop boundary (one loop ahead
  // of initial). visible-counts should stay strictly positive and bounded.
  const seamPx = initialScrollPx + 6000 * 1.5; // exactly one loop ahead in px
  const offsets = [-30, -10, 0, 10, 30];
  for (const offset of offsets) {
    await jumpToRenderScrollPx(page, seamPx + offset);
    const gateCount = await page.evaluate(
      (sel) => {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? Number(el.getAttribute("data-visible-count") ?? "0") : 0;
      },
      GATE_FIELD
    );
    expect(gateCount).toBeGreaterThan(0);
    expect(gateCount).toBeLessThanOrEqual(16);
  }
});

test("reduced motion lowers the visible-instance ceiling", async ({ page }) => {
  await setReducedMotion(page, true);
  await page.goto("/");
  await waitForInitialized(page);

  // Sample a few positions and confirm the gate visible-count never exceeds
  // the reduced-motion ceiling (6 by configuration).
  for (let i = 0; i < 6; i++) {
    const px = initialScrollPx + i * 137 * 1.5;
    await jumpToRenderScrollPx(page, px);
    const count = await page.evaluate(
      (sel) => {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? Number(el.getAttribute("data-visible-count") ?? "0") : 0;
      },
      GATE_FIELD
    );
    expect(count).toBeLessThanOrEqual(6);
  }
});

test("environment ON vs OFF: assisted docking still arrives at the same anchor", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // With environment ON, click anchor 03 menu nav and capture state.
  await page.locator('[data-testid="scene-nav-03"]').click();
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __rail?: {
          state: () => {
            focusedAnchorIndex: number;
            navigationState: string;
          };
        };
      };
      const s = w.__rail?.state();
      return s?.navigationState === "dockedHold" && s.focusedAnchorIndex === 2;
    },
    null,
    { timeout: 15_000 }
  );
  const withEnv = await readState(page);
  expect(withEnv.focusedAnchorIndex).toBe(2);

  // Toggle environment OFF, repeat the menu nav back to 01 then to 03.
  await page.locator(ENV_TOGGLE).click();
  await expect(page.locator(ENV_LAYER)).toHaveCount(0);

  await page.locator('[data-testid="scene-nav-01"]').click();
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __rail?: {
          state: () => {
            focusedAnchorIndex: number;
            navigationState: string;
          };
        };
      };
      const s = w.__rail?.state();
      return s?.navigationState === "dockedHold" && s.focusedAnchorIndex === 0;
    },
    null,
    { timeout: 15_000 }
  );

  await page.locator('[data-testid="scene-nav-03"]').click();
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __rail?: {
          state: () => {
            focusedAnchorIndex: number;
            navigationState: string;
          };
        };
      };
      const s = w.__rail?.state();
      return s?.navigationState === "dockedHold" && s.focusedAnchorIndex === 2;
    },
    null,
    { timeout: 15_000 }
  );

  const withoutEnv = await readState(page);
  expect(withoutEnv.focusedAnchorIndex).toBe(withEnv.focusedAnchorIndex);
  expect(withoutEnv.navigationState).toBe(withEnv.navigationState);
});

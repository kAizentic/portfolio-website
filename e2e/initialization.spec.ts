/**
 * E-1 — Initialization lands on Scene 01 without visible transition.
 *
 * Verifies that:
 *  - SceneLayer / SceneNav / DiagnosticOverlay are absent from the DOM
 *    before `initialized === true` (so no flash at the document top).
 *  - The first paint after initialization has focusedAnchorIndex === 0.
 *  - The camera is sitting on the central physical cycle (no
 *    visible-boundary risk).
 */

import { expect, test } from "@playwright/test";

import {
  initialPhysicalCycle,
  readState,
  waitForInitialized,
} from "./helpers";

test("E-1: initialization lands on Scene 01 with no visible transition", async ({
  page,
}) => {
  // Listen to the very first response so we can confirm SceneLayer is not
  // present in the SSR HTML (no flash at document top).
  let html = "";
  page.on("response", async (res) => {
    if (res.url().endsWith("/") || res.url().endsWith(":3210/")) {
      try {
        html = await res.text();
      } catch {
        /* ignored */
      }
    }
  });

  await page.goto("/");

  // SSR markup must not contain a SceneLayer or scene frames (initialized=false).
  expect(html).not.toContain('data-testid="scene-layer"');
  expect(html).not.toContain('data-testid="scene-frame-scene-01"');

  await waitForInitialized(page);

  await expect(page.locator('[data-testid="scene-layer"]')).toBeVisible();
  await expect(page.locator('[data-testid="diagnostic-overlay"]')).toBeVisible();
  await expect(page.locator('[data-testid="scene-nav"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="standard-view-toggle"]')
  ).toBeVisible();

  const state = await readState(page);
  expect(state.initialized).toBe(true);
  expect(state.focusedAnchorIndex).toBe(0);
  expect(state.physicalCycle).toBe(initialPhysicalCycle);
  expect(state.navigationState).toBe("dockedHold");
  expect(Math.abs(state.travelDepth)).toBeLessThan(1e-6);

  // The Standard View toggle must be present but non-actionable.
  const toggle = page.locator('[data-testid="standard-view-toggle"]');
  await expect(toggle).toHaveAttribute("aria-disabled", "true");
});

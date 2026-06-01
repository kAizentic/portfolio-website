/**
 * E-5 / E-6 — Menu and keyboard rail travel cannot be interrupted by
 * snapping or other input.
 *
 * The controller's idle-snap watcher refuses to initiate while
 * navigationState ∈ {"menu","keyboard"}, and the Lenis `lock: true` on
 * programmatic scrollTo prevents virtual-scroll input from disturbing the
 * scroll. We verify the user-visible consequence: navigation state stays
 * in the programmatic mode for the duration of travel, then transitions
 * straight to "dockedHold" with no intermediate "snapping" state.
 *
 * Also covers the "travel completion sets idle without a docking cycle"
 * rule from correction 3.
 */

import { expect, test } from "@playwright/test";

import {
  readState,
  waitForFocusedAnchor,
  waitForInitialized,
} from "./helpers";

test("E-5: menu travel cannot be interrupted by snapping", async ({ page }) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Sample navigationState rapidly while menu travel is in flight.
  const samplerPromise = page.evaluate(async () => {
    type State = { navigationState: string };
    const sampled: string[] = [];
    const w = window as unknown as { __rail?: { state: () => State } };
    const deadline = performance.now() + 4000;
    let lastState = "";
    while (performance.now() < deadline) {
      const s = w.__rail?.state().navigationState ?? "?";
      if (s !== lastState) {
        sampled.push(s);
        lastState = s;
      }
      if (
        (s === "idle" || s === "dockedHold") &&
        sampled.includes("menu")
      ) {
        break;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return sampled;
  });

  // Trigger menu travel (Scene 01 → Scene 04; mid-distance, ample duration).
  await page.locator('[data-testid="scene-nav-04"]').click();

  const sampled = await samplerPromise;

  // First state we sampled may be "idle" before the click registered; the
  // sequence must contain "menu" and end with docked hold, with NO "snapping"
  // between them.
  expect(sampled).toContain("menu");
  expect(sampled[sampled.length - 1]).toBe("dockedHold");
  const menuIdx = sampled.indexOf("menu");
  const tail = sampled.slice(menuIdx);
  expect(tail).not.toContain("snapping");

  const state = await readState(page);
  expect(state.focusedAnchorIndex).toBe(3);
  expect(state.manualDockPending).toBe(false);
});

test("E-6: keyboard travel cannot be interrupted by snapping", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  const samplerPromise = page.evaluate(async () => {
    type State = { navigationState: string };
    const sampled: string[] = [];
    const w = window as unknown as { __rail?: { state: () => State } };
    const deadline = performance.now() + 4000;
    let lastState = "";
    while (performance.now() < deadline) {
      const s = w.__rail?.state().navigationState ?? "?";
      if (s !== lastState) {
        sampled.push(s);
        lastState = s;
      }
      if (
        (s === "idle" || s === "dockedHold") &&
        sampled.includes("keyboard")
      ) {
        break;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return sampled;
  });

  // Fire End → go to Scene 06 via keyboard.
  await page.keyboard.press("End");

  const sampled = await samplerPromise;
  expect(sampled).toContain("keyboard");
  expect(sampled[sampled.length - 1]).toBe("dockedHold");
  const kbIdx = sampled.indexOf("keyboard");
  const tail = sampled.slice(kbIdx);
  expect(tail).not.toContain("snapping");

  await waitForFocusedAnchor(page, 5);
  const state = await readState(page);
  expect(state.manualDockPending).toBe(false);
});

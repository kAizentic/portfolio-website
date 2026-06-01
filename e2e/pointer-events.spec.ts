/**
 * E-9 — Pointer events (correction 4).
 *
 *  - During any movement state, at MOST one encounter frame may have
 *    pointer-events: auto.
 *  - When docked exactly at an encounter anchor (navigationState === "idle"
 *    and travelDepth ≈ baseAnchor), EXACTLY one frame has pointer-events:
 *    auto, and it is the focused anchor.
 *
 * Off-anchor zero-interactive is the legal and intended state.
 */

import { expect, test } from "@playwright/test";

import {
  countInteractiveFrames,
  jumpToRenderScrollPx,
  renderScrollPxForAnchor,
  sceneGap,
  initialPhysicalCycle,
  pxPerDU,
  waitForInitialized,
} from "./helpers";

test("E-9a: exactly one frame interactive when docked at an encounter anchor", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);
  // Initial state is docked at anchor 0.
  const count = await countInteractiveFrames(page);
  expect(count).toBe(1);

  // The focused frame must be the one with pointer-events: auto.
  const focusedTestId = await page.evaluate(() => {
    const frames = document.querySelectorAll<HTMLElement>(
      "[data-testid^='scene-frame-']"
    );
    let result: string | null = null;
    frames.forEach((f) => {
      if (window.getComputedStyle(f).pointerEvents === "auto") {
        result = f.getAttribute("data-testid");
      }
    });
    return result;
  });
  expect(focusedTestId).toBe("scene-frame-scene-01");
});

test("E-9b: at most one frame interactive while moving between encounters", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Sample pointer-events count at several off-anchor positions across one loop.
  const L = 6 * sceneGap;
  const baseRender = initialPhysicalCycle * L * pxPerDU;
  const samplePositions = [
    0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2.5, 3.5, 4.5, 5.25,
  ];

  for (const frac of samplePositions) {
    const px = baseRender + frac * sceneGap * pxPerDU;
    await jumpToRenderScrollPx(page, px);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null)))
    );
    const count = await countInteractiveFrames(page);
    expect(count, `at frac=${frac}, interactive count`).toBeLessThanOrEqual(1);
  }
});

test("E-9c: docking at a different anchor reveals exactly one interactive frame", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  await jumpToRenderScrollPx(page, renderScrollPxForAnchor(3));
  await page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
      )
  );

  const count = await countInteractiveFrames(page);
  expect(count).toBe(1);

  const focusedTestId = await page.evaluate(() => {
    const frames = document.querySelectorAll<HTMLElement>(
      "[data-testid^='scene-frame-']"
    );
    let result: string | null = null;
    frames.forEach((f) => {
      if (window.getComputedStyle(f).pointerEvents === "auto") {
        result = f.getAttribute("data-testid");
      }
    });
    return result;
  });
  expect(focusedTestId).toBe("scene-frame-scene-04");
});

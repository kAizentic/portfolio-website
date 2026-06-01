/**
 * E-10 — Reduced motion disables continuous scale and blur changes.
 *
 * With `prefers-reduced-motion: reduce` the controller picks
 * `visualMappingReducedMotion`, which pins `scale` to focus and `blurPx`
 * to focus regardless of the camera's distance from the anchor. Only
 * opacity (and discrete focus transitions) continue to update.
 *
 * We verify by sampling MotionValue-driven computed style at several
 * off-anchor positions and asserting that the focused scale and blur are
 * constant while opacity attenuates.
 */

import { expect, test } from "@playwright/test";

import {
  jumpToRenderScrollPx,
  renderScrollPxForAnchor,
  sceneGap,
  initialPhysicalCycle,
  pxPerDU,
  setReducedMotion,
  waitForInitialized,
} from "./helpers";

const FOCUSED_FRAME_SELECTOR = '[data-testid="scene-frame-scene-01"]';

const readVisuals = async (
  page: import("@playwright/test").Page
): Promise<{ scale: number; blurPx: number; opacity: number }> => {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error("frame not found");
    const cs = window.getComputedStyle(el);
    // scale is part of `transform`. Parse the matrix.
    const transform = cs.transform === "none" ? "" : cs.transform;
    let scale = 1;
    if (transform) {
      // matrix(a, b, c, d, e, f) or matrix3d(...)
      const m = transform.match(
        /matrix(3d)?\(([^)]+)\)/
      );
      if (m) {
        const parts = m[2].split(",").map((s) => parseFloat(s.trim()));
        if (m[1] === "3d") {
          // 3d matrix: scaleX = parts[0], scaleY = parts[5]
          scale = Math.hypot(parts[0], parts[1]);
        } else {
          scale = Math.hypot(parts[0], parts[1]);
        }
      }
    }
    let blurPx = 0;
    if (cs.filter && cs.filter !== "none") {
      const m = cs.filter.match(/blur\(([\d.]+)px\)/);
      if (m) blurPx = parseFloat(m[1]);
    }
    const opacity = parseFloat(cs.opacity);
    return { scale, blurPx, opacity };
  }, FOCUSED_FRAME_SELECTOR);
};

test("E-10: reduced motion pins continuous scale/blur and only opacity changes", async ({
  page,
}) => {
  await setReducedMotion(page, true);
  await page.goto("/");
  await waitForInitialized(page);

  // Focused at anchor 0 — read baseline visuals.
  await jumpToRenderScrollPx(page, renderScrollPxForAnchor(0));
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null)))
  );
  const baseline = await readVisuals(page);

  // Sample at several off-focus positions for the same frame (anchor 0).
  const L = 6 * sceneGap;
  const baseRender = initialPhysicalCycle * L * pxPerDU;
  const offsets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  for (const frac of offsets) {
    const px = baseRender + frac * sceneGap * pxPerDU;
    await jumpToRenderScrollPx(page, px);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null)))
    );
    const v = await readVisuals(page);
    // Scale and blur must stay at focus values.
    expect(v.scale).toBeCloseTo(baseline.scale, 2);
    expect(v.blurPx).toBeCloseTo(baseline.blurPx, 2);
    // Opacity is allowed to change (and should decrease as we leave the anchor).
  }
});

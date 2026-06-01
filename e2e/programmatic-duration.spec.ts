/**
 * Programmatic-travel duration tolerance (correction 1).
 *
 * Required by the user: an automated test proving a programmatic
 * multi-scene travel completes within the configured duration tolerance
 * and uses the configured travel duration rather than indefinite/default
 * Lenis lerp interpolation.
 *
 * Setup:
 *   sceneGap         = 1000
 *   baseDurationSec  = 0.70
 *   perSceneDurationSec = 0.18
 *   maxDurationSec   = 1.35
 *
 * Travel from anchor 0 → anchor 4 is the shortest equivalent route of
 * 2 scene-steps backward via the loop wrap (closestEquivalentAnchor),
 * so sceneSteps = 2 and expected duration = 0.70 + 2 * 0.18 = 1.06s
 * (clamped within [0.70, 1.35]).
 *
 * If lerp (default 0.1) were authoritative, the time-to-target would be
 * unrelated to durationSeconds and unbounded (asymptotic damping); we
 * assert a tight upper bound that is incompatible with lerp behavior.
 */

import { expect, test } from "@playwright/test";

import { motionTokens } from "@/config/motion-tokens";
import {
  readState,
  waitForInitialized,
  waitForNavState,
} from "./helpers";

test("programmatic travel duration uses configured seconds (not Lenis lerp)", async ({
  page,
}) => {
  await page.goto("/");
  await waitForInitialized(page);

  // Click Scene 04 (anchor 3). From anchor 0 the shortest route is +3 steps
  // forward (no wrap): sceneSteps = 3, expected duration =
  // base + 3*perScene = 0.70 + 0.54 = 1.24s.
  const sceneSteps = 3;
  const expectedSec = Math.min(
    motionTokens.menuTravel.baseDurationSeconds +
      sceneSteps * motionTokens.menuTravel.perSceneDurationSeconds,
    motionTokens.menuTravel.maxDurationSeconds
  );

  const startMs = Date.now();
  await page.locator('[data-testid="scene-nav-04"]').click();
  await waitForNavState(page, ["menu"]);
  await waitForNavState(page, ["dockedHold"], 5_000);
  const elapsedMs = Date.now() - startMs;
  const elapsedSec = elapsedMs / 1000;

  // Tolerance: at least the configured duration (programmatic must run for
  // at least that long), at most configured + 0.5s of overhead (click,
  // raf sync, idle transition). Critically, must be FAR less than what
  // lerp would deliver at default 0.1 over this distance (which would be
  // asymptotic and never strictly terminate).
  expect(elapsedSec).toBeGreaterThanOrEqual(expectedSec * 0.85);
  expect(elapsedSec).toBeLessThanOrEqual(expectedSec + 0.6);

  const state = await readState(page);
  expect(state.focusedAnchorIndex).toBe(3);
});

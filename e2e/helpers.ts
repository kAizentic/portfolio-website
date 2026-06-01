/**
 * Shared helpers for the diagnostic Playwright suite.
 *
 * The controller exposes a small test bridge on `window.__rail` (see
 * SpatialControllerContext "test bridge" effect). It is intentionally
 * minimal — tests should otherwise read state from the diagnostic overlay
 * and per-scene `data-*` attributes so the assertions reflect what users
 * would observe in a real browser.
 */

import type { Page } from "@playwright/test";

import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";

export const L = sceneManifest.length * motionTokens.sceneGap;
export const Lpx = L * motionTokens.pxPerDepthUnit;
export const pxPerDU = motionTokens.pxPerDepthUnit;
export const initialPhysicalCycle = motionTokens.physical.initialPhysicalCycle;
export const sceneGap = motionTokens.sceneGap;
export const initialScrollPx = initialPhysicalCycle * Lpx;

interface RailSnapshot {
  initialized: boolean;
  renderScrollPx: number;
  rebaseOffsetDepth: number;
  travelDepth: number;
  wrappedDepth: number;
  physicalCycle: number;
  loopCycle: number;
  focusedAnchorIndex: number;
  nearestAnchorIndex: number;
  navigationState:
    | "idle"
    | "dockedHold"
    | "manual"
    | "snapping"
    | "menu"
    | "keyboard";
  dockedHoldGatesOpen: boolean;
  departureIntentDetected: boolean;
  departureBufferPx: number;
  departureBufferThresholdPx: number;
  direction: -1 | 0 | 1;
  velocity: number;
  manualDockPending: boolean;
  reducedMotion: boolean;
  lastDockedAnchorIndex: number;
  departureRatio: number;
  departureDirection: -1 | 0 | 1;
  committedDockTargetIndex: number | null;
  holdRemainingSeconds: number;
}

/** Wait until the controller reports initialized and the overlay is mounted. */
export const waitForInitialized = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as unknown as { __rail?: { state: () => { initialized: boolean } } })
          .__rail?.state().initialized
      ),
    null,
    { timeout: 10_000 }
  );
  // Wait one frame so MotionValues propagate after initialized.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null)))
  );
};

export const readState = async (page: Page): Promise<RailSnapshot> => {
  return page.evaluate(() => {
    const w = window as unknown as {
      __rail?: { state: () => RailSnapshot };
    };
    if (!w.__rail) throw new Error("Test bridge not present");
    return w.__rail.state();
  }) as Promise<RailSnapshot>;
};

export const readTravelDepth = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const w = window as unknown as { __rail?: { travelDepth: () => number } };
    if (!w.__rail) throw new Error("Test bridge not present");
    return w.__rail.travelDepth();
  }) as Promise<number>;

/** Jump Lenis directly to a render scroll px (test-only deterministic seek). */
export const jumpToRenderScrollPx = async (
  page: Page,
  px: number
): Promise<void> => {
  await page.evaluate((target) => {
    const w = window as unknown as {
      __rail?: { jumpToRenderScrollPx: (px: number) => void };
    };
    if (!w.__rail) throw new Error("Test bridge not present");
    w.__rail.jumpToRenderScrollPx(target);
  }, px);
  // Allow one Lenis tick to publish derived state.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null)))
  );
};

/** Wait until navigationState matches one of the expected values. */
export const waitForNavState = async (
  page: Page,
  expected: ReadonlyArray<RailSnapshot["navigationState"]>,
  timeoutMs = 5_000
): Promise<void> => {
  await page.waitForFunction(
    (states) => {
      const w = window as unknown as {
        __rail?: { state: () => { navigationState: string } };
      };
      const s = w.__rail?.state().navigationState;
      return s !== undefined && (states as ReadonlyArray<string>).includes(s);
    },
    Array.from(expected) as string[],
    { timeout: timeoutMs }
  );
};

/** Wait until focusedAnchorIndex equals the expected index. */
export const departureBufferThresholdPx = motionTokens.landingHold
  .departureBufferThresholdPx;

/**
 * Convert a forward-along-rail magnitude into the browser wheel deltaY sign.
 *
 *   forwardScrollSign = -1 (default rail-camera convention):
 *     wheel UP   (deltaY < 0) advances forward → forward magnitude X → deltaY = -X
 *   forwardScrollSign = +1 (document convention):
 *     wheel DOWN (deltaY > 0) advances forward → forward magnitude X → deltaY = +X
 */
export const forwardWheelDeltaY = (forwardMagnitude: number): number => {
  return motionTokens.manualTravel.forwardScrollSign === -1
    ? -Math.abs(forwardMagnitude)
    : Math.abs(forwardMagnitude);
};

/**
 * Convert a backward-along-rail magnitude into the browser wheel deltaY sign.
 * Backward is the opposite of forward, so we invert the forward direction.
 */
export const backwardWheelDeltaY = (backwardMagnitude: number): number => {
  return -forwardWheelDeltaY(backwardMagnitude);
};

/**
 * Dispatch a wheel event in the forward-along-rail direction.
 * `magnitude` is always a positive number; the sign is applied internally
 * based on the configured `forwardScrollSign`.
 */
export const wheelForward = async (
  page: Page,
  magnitude: number
): Promise<void> => {
  await page.mouse.wheel(0, forwardWheelDeltaY(magnitude));
};

/** Dispatch a wheel event in the backward-along-rail direction. */
export const wheelBackward = async (
  page: Page,
  magnitude: number
): Promise<void> => {
  await page.mouse.wheel(0, backwardWheelDeltaY(magnitude));
};

/**
 * Accumulate deliberate wheel input in `direction` until the departure-buffer
 * release threshold is crossed. `magnitude` is the positive per-event step
 * size; the sign is applied via `forwardScrollSign`.
 */
export const wheelPastDepartureBuffer = async (
  page: Page,
  magnitude: number,
  direction: -1 | 1 = 1
): Promise<void> => {
  await page.mouse.move(640, 400);
  await waitForHoldGatesOpen(page);
  const threshold =
    (await readState(page)).departureBufferThresholdPx ||
    departureBufferThresholdPx;
  const deltaY =
    direction === 1
      ? forwardWheelDeltaY(magnitude)
      : backwardWheelDeltaY(magnitude);
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = await readState(page);
    if (s.navigationState !== "dockedHold") return;
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(45);
    const after = await readState(page);
    if (after.navigationState !== "dockedHold") return;
    if (Math.abs(after.departureBufferPx) >= threshold) {
      await page.waitForTimeout(30);
      if ((await readState(page)).navigationState !== "dockedHold") return;
    }
  }
};

/** Buffer release → manual travel → assisted dock → docked hold at anchor. */
export const wheelCommitFromDock = async (
  page: Page,
  magnitude: number,
  expectedAnchor: number,
  direction: -1 | 1 = 1
): Promise<void> => {
  await wheelPastDepartureBuffer(page, magnitude, direction);
  await waitForNavState(page, ["snapping"], 12_000);
  await waitForNavState(page, ["dockedHold"], 20_000);
  await page.waitForFunction(
    (idx) => {
      const w = window as unknown as {
        __rail?: {
          state: () => {
            lastDockedAnchorIndex: number;
            focusedAnchorIndex: number;
          };
        };
      };
      const s = w.__rail?.state();
      if (!s) return false;
      return (
        s.lastDockedAnchorIndex === idx || s.focusedAnchorIndex === idx
      );
    },
    expectedAnchor,
    { timeout: 20_000 }
  );
};

export const waitForHoldGatesOpen = async (
  page: Page,
  timeoutMs = 8_000
): Promise<void> => {
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __rail?: { state: () => { dockedHoldGatesOpen: boolean } };
      };
      return w.__rail?.state().dockedHoldGatesOpen === true;
    },
    null,
    { timeout: timeoutMs }
  );
};

export const waitForFocusedAnchor = async (
  page: Page,
  expected: number,
  timeoutMs = 5_000
): Promise<void> => {
  await page.waitForFunction(
    (idx) => {
      const w = window as unknown as {
        __rail?: { state: () => { focusedAnchorIndex: number } };
      };
      return w.__rail?.state().focusedAnchorIndex === idx;
    },
    expected,
    { timeout: timeoutMs }
  );
};

/** Convert a desired focusedAnchorIndex into a render-scroll px placing it on the focal plane. */
export const renderScrollPxForAnchor = (anchorIndex: number): number => {
  // travelDepth = baseAnchorDepth; rebaseOffsetDepth = -initialPhysicalCycle * L
  // depthToRenderScrollPx(d, rebase, pxPerDU) = (d - rebase) * pxPerDU
  //                                            = (anchorIndex * sceneGap + initialPhysicalCycle * L) * pxPerDU
  return (anchorIndex * sceneGap + initialPhysicalCycle * L) * pxPerDU;
};

/** Count scene frames currently advertising pointer-events: auto. */
export const countInteractiveFrames = async (
  page: Page
): Promise<number> => {
  return page.evaluate(() => {
    const frames = document.querySelectorAll<HTMLElement>(
      "[data-testid^='scene-frame-']"
    );
    let count = 0;
    frames.forEach((f) => {
      const pe = window.getComputedStyle(f).pointerEvents;
      if (pe === "auto") count += 1;
    });
    return count;
  });
};

export const setReducedMotion = async (
  page: Page,
  on: boolean
): Promise<void> => {
  await page.emulateMedia({ reducedMotion: on ? "reduce" : "no-preference" });
};

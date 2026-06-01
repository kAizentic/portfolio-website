/**
 * Phase B — Encounter Choreography Lab.
 *
 * Verifies the asymmetric depth-passage curve is live across two adjacent
 * encounter compositions, the scrubber drives both encounters from one
 * shared depth source, the pair toggle works, and reduced motion collapses
 * the passage to opacity-only.
 */

import { expect, test } from "@playwright/test";

const LAB = "/lab/encounter";

const A_ENCOUNTER = '[data-testid="a-encounter"]';
const B_ENCOUNTER = '[data-testid="b-encounter"]';
const SCRUBBER = '[data-testid="encounter-lab-scrubber"]';
const REL_A = '[data-testid="lab-rel-a"]';
const REL_B = '[data-testid="lab-rel-b"]';
const PHASE_A = '[data-testid="lab-phase-a"]';
const PHASE_B = '[data-testid="lab-phase-b"]';

const SCENE_GAP = 1000;

/**
 * Drive the lab's simulated travel depth via the `window.__lab` test bridge.
 * Bypasses React's controlled-input synchronization (which delays the first
 * non-zero set after a fresh page mount). Mirrors the `__rail` bridge used
 * by the live spatial-controller tests.
 */
const setScrubber = async (
  page: import("@playwright/test").Page,
  value: number
): Promise<void> => {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __lab?: { setDepth: unknown } }).__lab
        ?.setDepth === "function",
    null,
    { timeout: 5_000 }
  );
  await page.evaluate((val) => {
    const w = window as unknown as { __lab?: { setDepth: (n: number) => void } };
    w.__lab?.setDepth(val);
  }, value);
  // Wait until both encounter frames' data-passage-rel reflects the expected
  // camera distance (anchor − depth), proving React has committed.
  await page.waitForFunction(
    (expected) => {
      const a = document.querySelector<HTMLElement>(
        '[data-testid="a-encounter"]'
      );
      const b = document.querySelector<HTMLElement>(
        '[data-testid="b-encounter"]'
      );
      const aOk =
        !a ||
        Math.abs(Number(a.getAttribute("data-passage-rel")) - (0 - expected)) <
          1;
      const bOk =
        !b ||
        Math.abs(
          Number(b.getAttribute("data-passage-rel")) - (1000 - expected)
        ) < 1;
      return aOk && bOk;
    },
    value,
    { timeout: 5_000 }
  );
};

/** Enable / disable the lab's reduced-motion toggle via the test bridge. */
const setLabReducedMotion = async (
  page: import("@playwright/test").Page,
  enabled: boolean
): Promise<void> => {
  await page.waitForFunction(
    () =>
      typeof (
        window as unknown as { __lab?: { setReducedMotion: unknown } }
      ).__lab?.setReducedMotion === "function",
    null,
    { timeout: 5_000 }
  );
  await page.evaluate((val) => {
    const w = window as unknown as {
      __lab?: { setReducedMotion: (b: boolean) => void };
    };
    w.__lab?.setReducedMotion(val);
  }, enabled);
  // Wait for React to commit the new reducedMotion state into the lab root's
  // data attribute, proving every consumer (encounter frames) has re-rendered.
  await page.waitForFunction(
    (expected) => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="encounter-lab"]'
      );
      return el?.getAttribute("data-reduced-motion") === (expected ? "true" : "false");
    },
    enabled,
    { timeout: 5_000 }
  );
};

const readPassage = async (
  page: import("@playwright/test").Page,
  selector: string
): Promise<{
  phase: string;
  scale: number;
  opacity: number;
  blur: number;
  rel: number;
  computedOpacity: number;
}> => {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`${sel} not found`);
    return {
      phase: el.getAttribute("data-passage-phase") ?? "",
      scale: Number(el.getAttribute("data-passage-scale")),
      opacity: Number(el.getAttribute("data-passage-opacity")),
      blur: Number(el.getAttribute("data-passage-blur")),
      rel: Number(el.getAttribute("data-passage-rel")),
      computedOpacity: Number(getComputedStyle(el).opacity),
    };
  }, selector);
};

test("both adjacent encounter compositions render simultaneously", async ({
  page,
}) => {
  await page.goto(LAB);
  await expect(page.locator(A_ENCOUNTER)).toBeVisible();
  await expect(page.locator(B_ENCOUNTER)).toBeVisible();
  await expect(page.locator(SCRUBBER)).toBeVisible();
});

test("at depth 0: A docks, B incoming (asymmetric, both visible)", async ({
  page,
}) => {
  await page.goto(LAB);
  await setScrubber(page, 0);

  const a = await readPassage(page, A_ENCOUNTER);
  const b = await readPassage(page, B_ENCOUNTER);

  expect(a.phase).toBe("docked");
  expect(a.scale).toBeCloseTo(1, 2);
  expect(a.opacity).toBeCloseTo(1, 2);

  expect(b.phase).toBe("incoming");
  expect(b.scale).toBeLessThan(1);
  expect(b.opacity).toBeLessThan(1);
});

test("at depth +600: camera past A, B closer; outgoing oversize vs incoming undersize", async ({
  page,
}) => {
  await page.goto(LAB);
  // Camera ahead of A by 600 depth units; ahead of B (anchor 1000) means
  // distance to B is 400 (incoming closer to dock).
  await setScrubber(page, 600);

  const a = await readPassage(page, A_ENCOUNTER);
  const b = await readPassage(page, B_ENCOUNTER);

  expect(a.phase).toBe("outgoing");
  // Outgoing scale grows past 1.
  expect(a.scale).toBeGreaterThan(1);
  // Outgoing opacity has begun fading.
  expect(a.opacity).toBeLessThan(1);

  expect(b.phase).toBe("incoming");
  // Incoming scale is still <= 1 (asymmetric).
  expect(b.scale).toBeLessThanOrEqual(1);

  // Critical asymmetric check at simultaneous depths: outgoing scale > incoming.
  expect(a.scale).toBeGreaterThan(b.scale);
});

test("simultaneous visibility relationship: passing through A while approaching B", async ({
  page,
}) => {
  await page.goto(LAB);
  // Camera 800 past A; B is 200 away (deep into incoming). Both encounters
  // are simultaneously visible with intermediate opacities.
  await setScrubber(page, 800);

  const a = await readPassage(page, A_ENCOUNTER);
  const b = await readPassage(page, B_ENCOUNTER);

  // A has been passed through (outgoing); B is still incoming.
  expect(a.phase).toBe("outgoing");
  expect(b.phase).toBe("incoming");

  // Both opacities are strictly between 0 and 1 — neither is fully invisible
  // nor fully focused. This is the simultaneous visibility relationship that
  // proves the two-encounter passage curve is live.
  expect(a.opacity).toBeGreaterThan(0.05);
  expect(a.opacity).toBeLessThan(1);
  expect(b.opacity).toBeGreaterThan(0);
  expect(b.opacity).toBeLessThan(1);
});

test("scrubber drives both encounters from one shared depth source", async ({
  page,
}) => {
  await page.goto(LAB);
  await setScrubber(page, 0);
  const relAStart = await page.locator(REL_A).innerText();
  const relBStart = await page.locator(REL_B).innerText();
  expect(Number(relAStart)).toBeCloseTo(0, 0);
  expect(Number(relBStart)).toBeCloseTo(SCENE_GAP, 0);

  await setScrubber(page, 400);
  const relAAfter = await page.locator(REL_A).innerText();
  const relBAfter = await page.locator(REL_B).innerText();
  // A's rel decreases by 400, B's rel decreases by 400 (both consume the
  // same simulatedTravelDepth).
  expect(Number(relAAfter)).toBeCloseTo(-400, 0);
  expect(Number(relBAfter)).toBeCloseTo(SCENE_GAP - 400, 0);
});

test("pair toggle: A-only and B-only modes hide the other encounter", async ({
  page,
}) => {
  await page.goto(LAB);
  await page.locator('[data-testid="encounter-lab-pair-a-only"]').click();
  await expect(page.locator(B_ENCOUNTER)).toHaveCount(0);
  await expect(page.locator(A_ENCOUNTER)).toBeVisible();

  await page.locator('[data-testid="encounter-lab-pair-b-only"]').click();
  await expect(page.locator(A_ENCOUNTER)).toHaveCount(0);
  await expect(page.locator(B_ENCOUNTER)).toBeVisible();

  await page.locator('[data-testid="encounter-lab-pair-both"]').click();
  await expect(page.locator(A_ENCOUNTER)).toBeVisible();
  await expect(page.locator(B_ENCOUNTER)).toBeVisible();
});

test("phase classifier readouts match passage state at sampled depths", async ({
  page,
}) => {
  await page.goto(LAB);

  await setScrubber(page, 0);
  await expect(page.locator(PHASE_A)).toHaveText("docked");
  await expect(page.locator(PHASE_B)).toHaveText("incoming");

  await setScrubber(page, 600);
  await expect(page.locator(PHASE_A)).toHaveText("outgoing");
  await expect(page.locator(PHASE_B)).toHaveText("incoming");

  await setScrubber(page, 1000);
  await expect(page.locator(PHASE_A)).toHaveText("outgoing");
  await expect(page.locator(PHASE_B)).toHaveText("docked");
});

test("reduced motion collapses scale/blur/rotation to passive opacity ramp", async ({
  page,
}) => {
  await page.goto(LAB);
  await setLabReducedMotion(page, true);

  // Use depth = 1500 so A (anchor 0) is well past the 600-unit reduced
  // outgoing band → opacity clamped to 0. B (anchor 1000) is still incoming.
  await setScrubber(page, 1500);
  const a = await readPassage(page, A_ENCOUNTER);
  const b = await readPassage(page, B_ENCOUNTER);

  // Scale pinned to 1 on both sides (no oversize on outgoing in reduce mode).
  expect(a.scale).toBeCloseTo(1, 5);
  expect(b.scale).toBeCloseTo(1, 5);

  // Blur pinned to 0.
  expect(a.blur).toBe(0);
  expect(b.blur).toBe(0);

  // Opacity still attenuates — A is fully past the 600-unit reduced band.
  expect(a.opacity).toBeLessThan(0.05);
  // B is outgoing too at this depth (camera 500 past it).
  expect(b.opacity).toBeLessThan(1);
});

test("play-forward animates scrubber across the full passage", async ({
  page,
}) => {
  test.setTimeout(15_000);
  await page.goto(LAB);
  await setScrubber(page, -1500);

  await page.locator('[data-testid="encounter-lab-play-forward"]').click();

  // Wait until the scrubber readout shows we've passed both encounters.
  await page.waitForFunction(
    () => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="encounter-lab-depth-readout"]'
      );
      if (!el) return false;
      return Number(el.innerText) >= 1499;
    },
    null,
    { timeout: 12_000 }
  );

  // After play-forward both A and B should now be on the outgoing side.
  const a = await readPassage(page, A_ENCOUNTER);
  const b = await readPassage(page, B_ENCOUNTER);
  expect(a.phase).toBe("outgoing");
  expect(b.phase).toBe("outgoing");
});

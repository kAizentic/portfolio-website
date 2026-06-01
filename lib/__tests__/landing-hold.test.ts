import { describe, expect, it } from "vitest";

import {
  accumulateDepartureBufferPx,
  canReleaseDockedHold,
  decayDepartureBufferPx,
  departureRatioSeedFromBuffer,
  departureReleaseImpulseVirtualPx,
  effectiveDepartureBufferThresholdPx,
  effectiveMinimumHoldSeconds,
  isDepartureBufferReleaseReady,
  isDepartureIntent,
  isInputQuiet,
  isMinimumHoldSatisfied,
  isResidualScrollInput,
  shouldApplyLandingHold,
} from "@/lib/landing-hold";
import { motionTokens } from "@/config/motion-tokens";

const tokens = motionTokens.landingHold;

describe("shouldApplyLandingHold", () => {
  it("respects per-source flags", () => {
    expect(shouldApplyLandingHold("assistedDock", tokens)).toBe(true);
    expect(shouldApplyLandingHold("menuTravel", tokens)).toBe(true);
    expect(shouldApplyLandingHold("keyboardTravel", tokens)).toBe(true);
    expect(
      shouldApplyLandingHold("menuTravel", {
        ...tokens,
        applyAfterMenuTravel: false,
      })
    ).toBe(false);
  });
});

describe("input classification", () => {
  it("treats sub-threshold wheel as residual", () => {
    expect(isResidualScrollInput(18, tokens.departureIntentThreshold)).toBe(
      true
    );
    expect(isDepartureIntent(18, tokens.departureIntentThreshold)).toBe(false);
  });

  it("treats at-threshold wheel as departure intent", () => {
    expect(isDepartureIntent(42, tokens.departureIntentThreshold)).toBe(true);
    expect(isResidualScrollInput(42, tokens.departureIntentThreshold)).toBe(
      false
    );
  });
});

describe("departure buffer accumulation", () => {
  it("accumulates same-direction deliberate input", () => {
    let buf = 0;
    buf = accumulateDepartureBufferPx(buf, 50, tokens.departureIntentThreshold);
    buf = accumulateDepartureBufferPx(buf, 60, tokens.departureIntentThreshold);
    expect(buf).toBe(110);
  });

  it("resets on opposite-direction deliberate input", () => {
    let buf = 120;
    buf = accumulateDepartureBufferPx(buf, -80, tokens.departureIntentThreshold);
    expect(buf).toBe(-80);
  });

  it("ignores residual input", () => {
    expect(
      accumulateDepartureBufferPx(90, 12, tokens.departureIntentThreshold)
    ).toBe(90);
  });

  it("releases at threshold", () => {
    expect(isDepartureBufferReleaseReady(179, 180)).toBe(false);
    expect(isDepartureBufferReleaseReady(180, 180)).toBe(true);
    expect(isDepartureBufferReleaseReady(-200, 180)).toBe(true);
  });

  it("clamps release impulse to a fraction of buffered scroll", () => {
    expect(departureReleaseImpulseVirtualPx(180, 0.35)).toBeCloseTo(63, 6);
    expect(departureReleaseImpulseVirtualPx(-200, 0.35)).toBeCloseTo(-70, 6);
  });

  it("seeds commit ratio from buffer effort at threshold", () => {
    expect(
      departureRatioSeedFromBuffer(180, 180, 0.22)
    ).toBeCloseTo(0.22, 6);
    expect(
      departureRatioSeedFromBuffer(-220, 180, 0.22)
    ).toBeCloseTo(-0.22 * (220 / 180), 6);
  });
});

describe("departure buffer decay", () => {
  it("decays toward zero after input quiet", () => {
    const lastInput = 1000;
    const now = 1000 + tokens.inputQuietWindowSeconds * 1000 + 50;
    const next = decayDepartureBufferPx(
      120,
      lastInput,
      now,
      tokens.inputQuietWindowSeconds,
      tokens.departureBufferDecaySeconds,
      0.05
    );
    expect(next).toBeLessThan(120);
    expect(next).toBeGreaterThan(0);
  });

  it("does not decay while input is active", () => {
    const now = 2000;
    expect(
      decayDepartureBufferPx(
        120,
        now - 10,
        now,
        tokens.inputQuietWindowSeconds,
        tokens.departureBufferDecaySeconds,
        0.05
      )
    ).toBe(120);
  });
});

describe("canReleaseDockedHold", () => {
  const holdStart = 1000;

  it("requires minimum hold duration", () => {
    const lastInput = 900;
    expect(
      canReleaseDockedHold(holdStart, lastInput, 1100, false, tokens)
    ).toBe(false);
    const holdEnd = holdStart + tokens.minimumHoldSeconds * 1000 + 1;
    expect(canReleaseDockedHold(holdStart, holdEnd, holdEnd, false, tokens)).toBe(
      false
    );
  });

  it("requires input quiet after hold", () => {
    const t = holdStart + tokens.minimumHoldSeconds * 1000 + 50;
    expect(canReleaseDockedHold(holdStart, t - 10, t, false, tokens)).toBe(
      false
    );
    expect(
      canReleaseDockedHold(
        holdStart,
        t - tokens.inputQuietWindowSeconds * 1000 - 5,
        t,
        false,
        tokens
      )
    ).toBe(true);
  });

  it("uses shorter gates in reduced motion", () => {
    expect(
      effectiveMinimumHoldSeconds(true, tokens)
    ).toBeLessThan(effectiveMinimumHoldSeconds(false, tokens));
    expect(
      effectiveDepartureBufferThresholdPx(true, tokens)
    ).toBeLessThan(effectiveDepartureBufferThresholdPx(false, tokens));
    const holdStartRm = 0;
    const now =
      holdStartRm +
      tokens.minimumHoldSecondsReducedMotion * 1000 +
      tokens.inputQuietWindowSecondsReducedMotion * 1000 +
      1;
    expect(
      isMinimumHoldSatisfied(
        holdStartRm,
        now,
        effectiveMinimumHoldSeconds(true, tokens)
      )
    ).toBe(true);
    expect(
      isInputQuiet(
        now - tokens.inputQuietWindowSecondsReducedMotion * 1000 - 1,
        now,
        tokens.inputQuietWindowSecondsReducedMotion
      )
    ).toBe(true);
    expect(canReleaseDockedHold(holdStartRm, 0, now, true, tokens)).toBe(
      true
    );
  });
});

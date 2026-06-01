import { describe, expect, it } from "vitest";

import { contentPassageTokens } from "@/config/content-passage-tokens";
import {
  classifyPhase,
  contentMappingFromRel,
  elementStaggerSeconds,
} from "@/lib/content-passage";

const tokens = contentPassageTokens;

describe("classifyPhase", () => {
  it("classifies docked when |rel| ≤ dockedClarityZoneDepth", () => {
    expect(classifyPhase(0, tokens)).toBe("docked");
    expect(classifyPhase(80, tokens)).toBe("docked");
    expect(classifyPhase(-80, tokens)).toBe("docked");
  });

  it("classifies incoming when rel is strictly positive past the docked zone", () => {
    expect(classifyPhase(81, tokens)).toBe("incoming");
    expect(classifyPhase(1400, tokens)).toBe("incoming");
  });

  it("classifies outgoing when rel is strictly negative past the docked zone", () => {
    expect(classifyPhase(-81, tokens)).toBe("outgoing");
    expect(classifyPhase(-1200, tokens)).toBe("outgoing");
  });
});

describe("contentMappingFromRel — docked", () => {
  it("returns exactly the docked tokens at rel = 0", () => {
    const m = contentMappingFromRel(0, tokens, false);
    expect(m.phase).toBe("docked");
    expect(m.scale).toBe(tokens.docked.scale);
    expect(m.opacity).toBe(tokens.docked.opacity);
    expect(m.blurPx).toBe(tokens.docked.blurPx);
    expect(m.rotateYDeg).toBe(0);
    expect(m.lateralPx).toBe(0);
  });

  it("returns docked values throughout the docked clarity zone", () => {
    for (const rel of [-80, -40, 0, 40, 80]) {
      const m = contentMappingFromRel(rel, tokens, false);
      expect(m.phase).toBe("docked");
      expect(m.scale).toBe(tokens.docked.scale);
      expect(m.opacity).toBe(tokens.docked.opacity);
    }
  });
});

describe("contentMappingFromRel — incoming asymmetry", () => {
  it("incoming scale stays ≤ scaleAtDock (never larger than docked)", () => {
    for (const rel of [100, 400, 800, 1200, 1400]) {
      const m = contentMappingFromRel(rel, tokens, false);
      expect(m.scale).toBeLessThanOrEqual(tokens.incoming.scaleAtDock);
      expect(m.scale).toBeGreaterThanOrEqual(tokens.incoming.scaleStart);
    }
  });

  it("incoming opacity rises monotonically as rel decreases toward 0", () => {
    const samples = [1400, 1000, 600, 300, 100].map((r) =>
      contentMappingFromRel(r, tokens, false)
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].opacity).toBeGreaterThanOrEqual(
        samples[i - 1].opacity - 1e-9
      );
    }
    // Sampled beyond the full approach band — clamping forces opacityStart.
    const beyondBand = contentMappingFromRel(2000, tokens, false);
    expect(beyondBand.opacity).toBeCloseTo(tokens.incoming.opacityStart, 5);
  });

  it("incoming blur falls monotonically as rel decreases toward 0", () => {
    const samples = [1400, 1000, 600, 300, 100].map((r) =>
      contentMappingFromRel(r, tokens, false)
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].blurPx).toBeLessThanOrEqual(samples[i - 1].blurPx + 1e-9);
    }
  });

  it("just outside the docked zone the curve is continuous with docked values", () => {
    const justInside = contentMappingFromRel(80, tokens, false);
    const justOutside = contentMappingFromRel(81, tokens, false);
    expect(Math.abs(justInside.scale - justOutside.scale)).toBeLessThan(0.05);
    expect(Math.abs(justInside.opacity - justOutside.opacity)).toBeLessThan(
      0.05
    );
  });
});

describe("contentMappingFromRel — outgoing pass-through asymmetry", () => {
  it("outgoing scale grows BEYOND scaleAtDock (oversized after camera passes)", () => {
    const samples = [-100, -400, -800, -1200].map((r) =>
      contentMappingFromRel(r, tokens, false)
    );
    expect(samples[0].scale).toBeGreaterThanOrEqual(tokens.docked.scale);
    expect(samples[samples.length - 1].scale).toBeGreaterThan(
      tokens.docked.scale
    );
    // Monotonic growth as we leave the dock.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].scale).toBeGreaterThanOrEqual(
        samples[i - 1].scale - 1e-9
      );
    }
    // Beyond the full passage band — clamping pins to scaleAtEnd.
    const beyondBand = contentMappingFromRel(-2000, tokens, false);
    expect(beyondBand.scale).toBeCloseTo(tokens.outgoing.scaleAtEnd, 5);
  });

  it("outgoing opacity falls monotonically as camera moves further past", () => {
    const samples = [-100, -400, -800, -1200].map((r) =>
      contentMappingFromRel(r, tokens, false)
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].opacity).toBeLessThanOrEqual(
        samples[i - 1].opacity + 1e-9
      );
    }
    // Sampled beyond the full passage band — clamping forces opacityAtEnd.
    const beyondBand = contentMappingFromRel(-2000, tokens, false);
    expect(beyondBand.opacity).toBeCloseTo(tokens.outgoing.opacityAtEnd, 5);
  });

  it("outgoing blur grows toward blurAtEndPx (legibility breaks as camera passes)", () => {
    const beyondBand = contentMappingFromRel(-2000, tokens, false);
    expect(beyondBand.blurPx).toBeCloseTo(tokens.outgoing.blurAtEndPx, 1);
  });

  it("incoming and outgoing scale ramps are ASYMMETRIC across the dock", () => {
    // Same |rel|, opposite sign: outgoing scale > incoming scale.
    for (const distance of [200, 500, 900]) {
      const incoming = contentMappingFromRel(distance, tokens, false);
      const outgoing = contentMappingFromRel(-distance, tokens, false);
      expect(outgoing.scale).toBeGreaterThan(incoming.scale);
    }
  });
});

describe("contentMappingFromRel — reduced motion", () => {
  it("pins scale to 1 across the entire passage", () => {
    for (const rel of [-1200, -600, -100, 0, 100, 600, 1200]) {
      const m = contentMappingFromRel(rel, tokens, true);
      expect(m.scale).toBe(1);
    }
  });

  it("pins blur to 0", () => {
    for (const rel of [-1200, -600, 0, 600, 1200]) {
      const m = contentMappingFromRel(rel, tokens, true);
      expect(m.blurPx).toBe(0);
    }
  });

  it("pins rotation to 0", () => {
    for (const rel of [-1200, -600, 0, 600, 1200]) {
      const m = contentMappingFromRel(rel, tokens, true);
      expect(m.rotateYDeg).toBe(0);
      expect(m.lateralPx).toBe(0);
    }
  });

  it("keeps opacity attenuating so encounters still appear / disappear", () => {
    const far = contentMappingFromRel(600, tokens, true);
    const docked = contentMappingFromRel(0, tokens, true);
    expect(docked.opacity).toBeGreaterThan(far.opacity);
  });

  it("collapses to the reduced bands so the encounter window is shorter", () => {
    // At rel = 700 with reduced bands (incomingApproachRangeDepth = 600),
    // the camera is OUTSIDE the incoming band → opacity should be at its start.
    const beyondReducedBand = contentMappingFromRel(700, tokens, true);
    expect(beyondReducedBand.opacity).toBeLessThan(0.1);
  });
});

describe("elementStaggerSeconds", () => {
  it("is zero for the first element and grows linearly with index", () => {
    expect(elementStaggerSeconds(0, tokens, false)).toBe(0);
    expect(elementStaggerSeconds(2, tokens, false)).toBeCloseTo(
      2 * tokens.secondary.headlineStaggerSeconds,
      5
    );
  });

  it("collapses to zero in reduced motion", () => {
    expect(elementStaggerSeconds(2, tokens, true)).toBe(0);
  });
});

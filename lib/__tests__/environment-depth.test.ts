import { describe, expect, it } from "vitest";

import { environmentTokens } from "@/config/environment-tokens";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import {
  DEFAULT_FADE_MARGIN_DEPTH,
  assertEnvironmentTokensValid,
  atmosphericClarity,
  encounterThresholdInstances,
  equivalentEnvironmentInstance,
  gateInstancesAtDepth,
  maxVisibleInstanceCount,
  validateEnvironmentTokens,
} from "@/lib/environment-depth";

const loopLength = sceneManifest.length * motionTokens.sceneGap; // 6000

describe("validateEnvironmentTokens", () => {
  it("accepts the bundled tokens against the live loop length", () => {
    const result = validateEnvironmentTokens(environmentTokens, loopLength);
    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("rejects gateSpacing that does not divide loopLength (I-E1)", () => {
    const result = validateEnvironmentTokens(
      { ...environmentTokens, gateSpacing: 175 },
      loopLength
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join("\n")).toMatch(/I-E1/);
  });

  it("rejects renderWindow ≥ loopLength/2 (I-E2)", () => {
    const result = validateEnvironmentTokens(
      { ...environmentTokens, gateRenderWindowDepth: loopLength / 2 },
      loopLength
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join("\n")).toMatch(/I-E2/);
  });

  it("rejects fogEnd > renderWindow − fadeMargin (I-E3)", () => {
    const tokens = {
      ...environmentTokens,
      fogEndDepth:
        environmentTokens.gateRenderWindowDepth - DEFAULT_FADE_MARGIN_DEPTH + 1,
    };
    const result = validateEnvironmentTokens(tokens, loopLength);
    expect(result.ok).toBe(false);
    expect(result.reasons.join("\n")).toMatch(/I-E3/);
  });

  it("assertEnvironmentTokensValid throws with a useful message", () => {
    expect(() =>
      assertEnvironmentTokensValid(
        { ...environmentTokens, gateSpacing: 175 },
        loopLength
      )
    ).toThrow(/I-E1/);
  });
});

describe("atmosphericClarity", () => {
  it("is fully clear inside the fog start window", () => {
    expect(atmosphericClarity(0, 600, 1400)).toBe(1);
    expect(atmosphericClarity(599, 600, 1400)).toBe(1);
    expect(atmosphericClarity(600, 600, 1400)).toBe(1);
  });
  it("is fully fogged at or beyond fog end", () => {
    expect(atmosphericClarity(1400, 600, 1400)).toBe(0);
    expect(atmosphericClarity(2000, 600, 1400)).toBe(0);
  });
  it("is monotonically decreasing across the haze ramp", () => {
    const samples = [600, 800, 1000, 1200, 1400].map((d) =>
      atmosphericClarity(d, 600, 1400)
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBe(1);
    expect(samples[samples.length - 1]).toBe(0);
  });
});

describe("equivalentEnvironmentInstance", () => {
  it("returns null when the nearest equivalent is outside the render window", () => {
    const result = equivalentEnvironmentInstance(
      0,
      3000, // exactly L/2 away — boundary excluded
      loopLength,
      1500,
      600,
      1400,
      "gate",
      15
    );
    expect(result).toBeNull();
  });

  it("picks the nearest wrap of a base slot", () => {
    // Camera near loop boundary (depth = 5900); slot 0 (depth 0) has its
    // forward equivalent at +6000, distance 100 — closer than backward 5900.
    const result = equivalentEnvironmentInstance(
      5900,
      0,
      loopLength,
      1500,
      600,
      1400,
      "gate",
      0
    );
    expect(result).not.toBeNull();
    expect(result!.equivalentDepth).toBe(6000);
    expect(result!.relativeDepth).toBe(100);
    expect(result!.clarity).toBe(1);
  });
});

describe("gateInstancesAtDepth — wrap continuity", () => {
  const spacing = environmentTokens.gateSpacing;
  const window = environmentTokens.gateRenderWindowDepth;
  const fogStart = environmentTokens.fogStartDepth;
  const fogEnd = environmentTokens.fogEndDepth;

  it("emits a continuous set of gates around the camera", () => {
    const gates = gateInstancesAtDepth(
      1234.5,
      loopLength,
      spacing,
      window,
      fogStart,
      fogEnd
    );
    expect(gates.length).toBeGreaterThan(0);
    // Every emitted gate is within the render window.
    for (const g of gates) {
      expect(Math.abs(g.relativeDepth)).toBeLessThan(window);
      expect(g.clarity).toBeGreaterThanOrEqual(0);
      expect(g.clarity).toBeLessThanOrEqual(1);
    }
  });

  it("no two emitted gates share the same equivalentDepth", () => {
    const gates = gateInstancesAtDepth(
      4321,
      loopLength,
      spacing,
      window,
      fogStart,
      fogEnd
    );
    const seen = new Set<number>();
    for (const g of gates) {
      expect(seen.has(g.equivalentDepth)).toBe(false);
      seen.add(g.equivalentDepth);
    }
  });

  it("crossing the loop boundary preserves the visible set continuously", () => {
    // Sample just below and just above a loop seam and confirm the visible
    // set of base slot indices is identical (or shifted by exactly 0/±1)
    // — there must be no sudden gap caused by wrap.
    const slotIndicesAt = (depth: number): Set<number> => {
      const set = new Set<number>();
      const gates = gateInstancesAtDepth(
        depth,
        loopLength,
        spacing,
        window,
        fogStart,
        fogEnd
      );
      for (const g of gates) {
        const k = g.key.split("-").pop()!;
        set.add(Number(k));
      }
      return set;
    };
    const a = slotIndicesAt(loopLength - 1);
    const b = slotIndicesAt(loopLength + 1);
    // The sets differ by at most one slot (the one that just wrapped past
    // the camera). Symmetric difference cardinality ≤ 2.
    let diff = 0;
    for (const k of a) if (!b.has(k)) diff++;
    for (const k of b) if (!a.has(k)) diff++;
    expect(diff).toBeLessThanOrEqual(2);
  });

  it("never simultaneously emits two equivalents of the same slot (I-E2)", () => {
    // Sample at many depths; group emitted instances by slot index and
    // assert count ≤ 1 per slot per frame.
    for (let d = 0; d < loopLength; d += 137) {
      const gates = gateInstancesAtDepth(
        d,
        loopLength,
        spacing,
        window,
        fogStart,
        fogEnd
      );
      const counts = new Map<number, number>();
      for (const g of gates) {
        const slotIdx = Number(g.key.split("-").pop());
        counts.set(slotIdx, (counts.get(slotIdx) ?? 0) + 1);
      }
      for (const c of counts.values()) {
        expect(c).toBe(1);
      }
    }
  });

  it("visible count never exceeds the theoretical maximum", () => {
    const maxCount = maxVisibleInstanceCount(window, spacing);
    for (let d = 0; d < loopLength; d += 53) {
      const gates = gateInstancesAtDepth(
        d,
        loopLength,
        spacing,
        window,
        fogStart,
        fogEnd
      );
      expect(gates.length).toBeLessThanOrEqual(maxCount);
    }
  });

  it("fully fogged gates are at clarity 0 (invisible-region guarantee)", () => {
    const gates = gateInstancesAtDepth(
      0,
      loopLength,
      spacing,
      window,
      fogStart,
      fogEnd
    );
    for (const g of gates) {
      if (Math.abs(g.relativeDepth) >= fogEnd) {
        expect(g.clarity).toBe(0);
      }
    }
  });
});

describe("encounterThresholdInstances", () => {
  it("emits one instance per anonymous anchor within the render window", () => {
    const list = encounterThresholdInstances(
      0,
      loopLength,
      motionTokens.sceneGap,
      sceneManifest,
      environmentTokens.encounterThresholdRenderWindowDepth,
      environmentTokens.fogStartDepth,
      environmentTokens.fogEndDepth
    );
    // At depth 0, the closest anchors are 0 (forward) and the wrap of 5
    // (backward at −1000). Both fit within an 1800-unit render window.
    expect(list.length).toBeGreaterThan(0);
    const indices = new Set(list.map((i) => i.key));
    // Every key is a distinct anchor.
    expect(indices.size).toBe(list.length);
  });

  it("places focused anchor at zero relative depth", () => {
    const list = encounterThresholdInstances(
      2000, // anchor 2 (anchorIndex 2 * sceneGap 1000)
      loopLength,
      motionTokens.sceneGap,
      sceneManifest,
      environmentTokens.encounterThresholdRenderWindowDepth,
      environmentTokens.fogStartDepth,
      environmentTokens.fogEndDepth
    );
    const focused = list.find((i) => Math.abs(i.relativeDepth) < 1e-6);
    expect(focused).toBeDefined();
    expect(focused!.equivalentDepth).toBe(2000);
  });
});

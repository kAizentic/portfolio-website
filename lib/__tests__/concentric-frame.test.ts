import { describe, expect, it } from "vitest";

import { motionTokens } from "@/config/motion-tokens";
import {
  buildRings,
  clamp01,
  convergenceFromDepth,
  convergenceFromProximity,
  FRAME_COLORS,
  FRAME_SECTION_SIZES,
  frameSizeAtDepth,
  nearestAnchorDistance,
  ringOpacity,
  ringPath,
  ringRotation,
  ringScale,
  smoothstep,
} from "@/lib/concentric-frame";

const sceneGap = motionTokens.sceneGap; // 1000

describe("buildRings", () => {
  it("is deterministic across calls", () => {
    expect(buildRings()).toEqual(buildRings());
  });

  it("cycles the palette and nests outward", () => {
    const rings = buildRings();
    expect(rings.length).toBeGreaterThanOrEqual(4);
    expect(rings[0].color).toBe(FRAME_COLORS[0]);
    expect(rings[1].color).toBe(FRAME_COLORS[1]);
    expect(rings[2].color).toBe(FRAME_COLORS[2]);
    expect(rings[0].inset).toBe(0); // innermost is the content frame
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i].inset).toBeGreaterThan(rings[i - 1].inset);
      expect(rings[i].expand).toBeGreaterThan(rings[i - 1].expand);
      expect(Math.abs(rings[i].rollDeg)).toBeGreaterThan(
        Math.abs(rings[i - 1].rollDeg)
      );
      expect(rings[i].baseOpacity).toBeLessThan(rings[i - 1].baseOpacity);
    }
    // Roll direction alternates for a layered cascade.
    expect(Math.sign(rings[0].rollDeg)).not.toBe(Math.sign(rings[1].rollDeg));
  });
});

describe("ringPath", () => {
  const [inner, , outer] = buildRings();

  it("emits a closed rounded-square path", () => {
    const d = ringPath(400, 300, inner);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
  });

  it("grows with the frame size", () => {
    const small = ringPath(300, 200, inner);
    const large = ringPath(600, 400, inner);
    const maxCoord = (d: string) =>
      Math.max(...d.match(/-?\d+\.\d+/g)!.map((v) => Math.abs(Number(v))));
    expect(maxCoord(large)).toBeGreaterThan(maxCoord(small));
  });

  it("outer rings inset a margin beyond the innermost", () => {
    const innerMax = Math.max(
      ...ringPath(400, 300, inner).match(/-?\d+\.\d+/g)!.map((v) => Math.abs(Number(v)))
    );
    const outerMax = Math.max(
      ...ringPath(400, 300, outer).match(/-?\d+\.\d+/g)!.map((v) => Math.abs(Number(v)))
    );
    expect(outerMax).toBeGreaterThan(innerMax);
  });
});

describe("frameSizeAtDepth", () => {
  it("returns the exact section size on each anchor", () => {
    for (let i = 0; i < FRAME_SECTION_SIZES.length; i++) {
      const size = frameSizeAtDepth(i * sceneGap, sceneGap);
      expect(size.hw).toBeCloseTo(FRAME_SECTION_SIZES[i].hw, 6);
      expect(size.hh).toBeCloseTo(FRAME_SECTION_SIZES[i].hh, 6);
    }
  });

  it("interpolates linearly between adjacent sections", () => {
    const a = FRAME_SECTION_SIZES[0];
    const b = FRAME_SECTION_SIZES[1];
    const mid = frameSizeAtDepth(sceneGap / 2, sceneGap);
    expect(mid.hw).toBeCloseTo((a.hw + b.hw) / 2, 6);
    expect(mid.hh).toBeCloseTo((a.hh + b.hh) / 2, 6);
  });

  it("blends the last section back to the first across the loop seam", () => {
    const n = FRAME_SECTION_SIZES.length;
    const last = FRAME_SECTION_SIZES[n - 1];
    const first = FRAME_SECTION_SIZES[0];
    const seam = frameSizeAtDepth((n - 0.5) * sceneGap, sceneGap);
    expect(seam.hw).toBeCloseTo((last.hw + first.hw) / 2, 6);
    // wraps cleanly: depth n*sceneGap == depth 0
    const wrapped = frameSizeAtDepth(n * sceneGap, sceneGap);
    expect(wrapped.hw).toBeCloseTo(first.hw, 6);
  });
});

describe("nearestAnchorDistance", () => {
  it("is 0 exactly on an anchor and half-gap at the midpoint", () => {
    expect(nearestAnchorDistance(0, sceneGap)).toBe(0);
    expect(nearestAnchorDistance(sceneGap, sceneGap)).toBe(0);
    expect(nearestAnchorDistance(sceneGap / 2, sceneGap)).toBe(sceneGap / 2);
  });

  it("handles negative depths (rebased camera below origin)", () => {
    expect(nearestAnchorDistance(-sceneGap, sceneGap)).toBe(0);
    expect(nearestAnchorDistance(-sceneGap / 2, sceneGap)).toBe(sceneGap / 2);
  });
});

describe("convergenceFromProximity", () => {
  it("reaches 1 when docked and 0 at the midpoint", () => {
    expect(convergenceFromProximity(0, sceneGap)).toBeCloseTo(1, 6);
    expect(convergenceFromProximity(sceneGap / 2, sceneGap)).toBeCloseTo(0, 6);
  });

  it("is monotonically decreasing with distance", () => {
    let prev = Infinity;
    for (let dist = 0; dist <= sceneGap / 2; dist += sceneGap / 20) {
      const c = convergenceFromProximity(dist, sceneGap);
      expect(c).toBeLessThanOrEqual(prev + 1e-9);
      prev = c;
    }
  });

  it("convergenceFromDepth composes distance + mapping", () => {
    expect(convergenceFromDepth(0, sceneGap)).toBeCloseTo(1, 6);
    expect(convergenceFromDepth(sceneGap / 2, sceneGap)).toBeCloseTo(0, 6);
    expect(convergenceFromDepth(3 * sceneGap, sceneGap)).toBeCloseTo(1, 6);
  });
});

describe("ring transforms", () => {
  const rings = buildRings();

  it("scale is 1 when framed and >1 when loose", () => {
    for (const ring of rings) {
      expect(ringScale(1, ring)).toBeCloseTo(1, 6);
      expect(ringScale(0, ring)).toBeGreaterThan(1);
    }
  });

  it("rotation is 0 when framed and the full roll when loose", () => {
    for (const ring of rings) {
      expect(ringRotation(1, ring)).toBeCloseTo(0, 6);
      expect(ringRotation(0, ring)).toBeCloseTo(ring.rollDeg, 6);
    }
  });

  it("opacity grows with convergence and stays within bounds", () => {
    for (const ring of rings) {
      const loose = ringOpacity(0, ring);
      const framed = ringOpacity(1, ring);
      expect(framed).toBeGreaterThan(loose);
      expect(loose).toBeGreaterThanOrEqual(0);
      expect(framed).toBeLessThanOrEqual(1);
    }
  });
});

describe("scalar helpers", () => {
  it("clamp01 and smoothstep clamp their domain", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
  });
});

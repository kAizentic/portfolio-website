import { describe, expect, it } from "vitest";

import {
  clamp,
  closestEquivalentAnchor,
  depthToRenderScrollPx,
  lerp,
  loopLength,
  travelDepthFrom,
  visualMapping,
  visualMappingReducedMotion,
  wrap,
} from "@/lib/depth-math";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";

const L = loopLength(sceneManifest, motionTokens.sceneGap);

/** U-1 — wrap */
describe("wrap", () => {
  it("identity for positive values inside [0, L)", () => {
    expect(wrap(0, L)).toBe(0);
    expect(wrap(1, L)).toBe(1);
    expect(wrap(L - 0.001, L)).toBeCloseTo(L - 0.001, 5);
  });
  it("wraps positive multiples of L back to 0", () => {
    expect(wrap(L, L)).toBe(0);
    expect(wrap(2 * L, L)).toBe(0);
    expect(wrap(L + 17, L)).toBeCloseTo(17, 6);
  });
  it("wraps negative inputs into [0, L)", () => {
    expect(wrap(-1, L)).toBeCloseTo(L - 1, 6);
    expect(wrap(-L, L)).toBe(0);
    expect(wrap(-L - 5, L)).toBeCloseTo(L - 5, 6);
  });
});

/** U-2 — closestEquivalentAnchor */
describe("closestEquivalentAnchor", () => {
  it("returns the base anchor when camera is at the base", () => {
    expect(closestEquivalentAnchor(0, 0, L)).toBe(0);
    expect(closestEquivalentAnchor(2000, 2000, L)).toBe(2000);
  });
  it("returns base + L when camera has moved beyond half a loop forward", () => {
    // base = 0, camera at L*0.6 → equivalent is at +L (closer than 0).
    const cam = L * 0.6;
    expect(closestEquivalentAnchor(cam, 0, L)).toBe(L);
  });
  it("returns base − L when camera has moved beyond half a loop backward", () => {
    // base = 0, camera at -L*0.6 → equivalent at -L.
    const cam = -L * 0.6;
    expect(closestEquivalentAnchor(cam, 0, L)).toBe(-L);
  });
  it("ties at |rel| = L/2 break toward +L (Math.round half-up)", () => {
    const cam = L / 2;
    expect(closestEquivalentAnchor(cam, 0, L)).toBe(L);
  });
  it("equivalent depth is always within L/2 of camera", () => {
    for (const cam of [-12345.5, -L * 1.3, 0, L * 0.49, L * 2.7, 88888]) {
      for (let i = 0; i < sceneManifest.length; i++) {
        const base = sceneManifest[i].anchorIndex * motionTokens.sceneGap;
        const eq = closestEquivalentAnchor(cam, base, L);
        const rel = eq - cam;
        // (−L/2, L/2] — Math.round resolves the upper boundary inclusive.
        expect(rel).toBeGreaterThan(-L / 2);
        expect(rel).toBeLessThanOrEqual(L / 2);
      }
    }
  });
});

/** U-3 — depthToRenderScrollPx + travelDepthFrom round-trip */
describe("depthToRenderScrollPx ↔ travelDepthFrom", () => {
  it("round-trips for arbitrary rebase offsets and depths", () => {
    const cases = [
      { depth: 0, rebase: 0 },
      { depth: 1234.5, rebase: 0 },
      { depth: 1234.5, rebase: -3 * L },
      { depth: -987.6, rebase: 5 * L },
      { depth: 17 * L + 42, rebase: -17 * L },
    ];
    for (const { depth, rebase } of cases) {
      const px = depthToRenderScrollPx(depth, rebase, motionTokens.pxPerDepthUnit);
      const recovered = travelDepthFrom(px, rebase, motionTokens.pxPerDepthUnit);
      expect(recovered).toBeCloseTo(depth, 8);
    }
  });
});

/** U-6 — focus selection across Scene 06 ↔ Scene 01 boundary */
describe("focus selection across the 06↔01 boundary", () => {
  // Scene 06 is at anchorIndex 5; Scene 01 is at anchorIndex 0.
  // Just below the midpoint between 5*sceneGap and 6*sceneGap = L, the
  // nearest equivalent of Scene 06 is the base anchor; just above it the
  // nearest is Scene 01's equivalent at +L.
  const sceneGap = motionTokens.sceneGap;
  const sceneIndices = sceneManifest.map((s, i) => i);

  const pickFocus = (cam: number): number => {
    let bestAbs = Infinity;
    let focus = 0;
    for (const i of sceneIndices) {
      const base = sceneManifest[i].anchorIndex * sceneGap;
      const eq = closestEquivalentAnchor(cam, base, L);
      const abs = Math.abs(eq - cam);
      if (abs < bestAbs) {
        bestAbs = abs;
        focus = i;
      }
    }
    return focus;
  };

  it("focused index is 5 (Scene 06) just below the boundary", () => {
    expect(pickFocus(5 * sceneGap)).toBe(5);
    expect(pickFocus(5 * sceneGap + sceneGap * 0.4)).toBe(5);
    expect(pickFocus(5 * sceneGap + sceneGap * 0.499)).toBe(5);
  });
  it("focused index flips to 0 (Scene 01) just above the boundary", () => {
    expect(pickFocus(5 * sceneGap + sceneGap * 0.501)).toBe(0);
    expect(pickFocus(5 * sceneGap + sceneGap * 0.9)).toBe(0);
    expect(pickFocus(6 * sceneGap)).toBe(0);
  });
  it("traversing forward across N×L still resolves the right anchor", () => {
    // Multiple loop revolutions forward — should still cycle through 0..5.
    for (let loops = 0; loops < 3; loops++) {
      for (let i = 0; i < sceneManifest.length; i++) {
        const cam = loops * L + i * sceneGap;
        expect(pickFocus(cam)).toBe(i);
      }
    }
  });
  it("traversing backward through several revolutions still resolves the right anchor", () => {
    for (let loops = 1; loops < 4; loops++) {
      for (let i = 0; i < sceneManifest.length; i++) {
        const cam = -loops * L + i * sceneGap;
        expect(pickFocus(cam)).toBe(i);
      }
    }
  });
});

/** Helpers — lerp/clamp sanity */
describe("lerp + clamp", () => {
  it("lerp returns endpoints at 0 and 1", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it("clamp respects bounds", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

/** Visual mapping sanity for documenting behavior */
describe("visualMapping", () => {
  it("returns focus values at rel = 0", () => {
    const m = visualMapping(0, motionTokens);
    expect(m.opacity).toBeCloseTo(motionTokens.opacityAt.focus, 8);
    expect(m.scale).toBeCloseTo(motionTokens.scaleAt.focus, 8);
    expect(m.blurPx).toBeCloseTo(motionTokens.blurPxAt.focus, 8);
    expect(m.translateZ).toBe(0);
    expect(m.pointerEvents).toBe("auto");
  });
  it("returns far values at |rel| >= windowRadius", () => {
    const m = visualMapping(motionTokens.windowRadius, motionTokens);
    expect(m.opacity).toBeCloseTo(motionTokens.opacityAt.far, 8);
    expect(m.scale).toBeCloseTo(motionTokens.scaleAt.far, 8);
    expect(m.blurPx).toBeCloseTo(motionTokens.blurPxAt.far, 8);
    // translateZ uses sign(rel) so at +windowRadius it's +far.
    expect(m.translateZ).toBeCloseTo(motionTokens.translateZAt.far, 8);
    expect(m.pointerEvents).toBe("none");
  });
  it("reduced-motion mapping pins scale and blur to focus", () => {
    const m = visualMappingReducedMotion(motionTokens.windowRadius, motionTokens);
    expect(m.scale).toBe(motionTokens.scaleAt.focus);
    expect(m.blurPx).toBe(motionTokens.blurPxAt.focus);
    expect(m.translateZ).toBe(0);
  });
});

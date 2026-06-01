import { describe, expect, it } from "vitest";

import { defaultSpatialConfig } from "@/config/spatial-config";
import { validateSpatialConfig } from "@/lib/config-validation";
import type { SpatialConfig } from "@/types/spatial";

/** Deep clone preserving function references (easing functions). */
const cloneConfig = (config: SpatialConfig): SpatialConfig => ({
  ...config,
  motion: {
    ...config.motion,
    physical: { ...config.motion.physical },
    scaleAt: { ...config.motion.scaleAt },
    opacityAt: { ...config.motion.opacityAt },
    blurPxAt: { ...config.motion.blurPxAt },
    translateZAt: { ...config.motion.translateZAt },
    snap: { ...config.motion.snap },
    menuTravel: { ...config.motion.menuTravel },
    keyboard: { ...config.motion.keyboard },
    reducedMotion: { ...config.motion.reducedMotion },
  },
  scenes: [...config.scenes],
});

describe("validateSpatialConfig", () => {
  it("accepts the default diagnostic configuration", () => {
    const result = validateSpatialConfig(defaultSpatialConfig);
    expect(result.valid).toBe(true);
  });

  it("rejects I-1 (windowRadius >= loopLength / 2)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    // loopLength = 6 * 1000 = 6000 → L/2 = 3000.
    c.motion.windowRadius = 3000;
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-1");
    }
  });

  it("rejects I-2 (focusEpsilon >= sceneGap / 2)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    c.motion.focusEpsilon = 600; // sceneGap/2 = 500
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-2");
    }
  });

  it("rejects I-3 (translateZAt.focus !== 0)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    c.motion.translateZAt.focus = 10;
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-3");
    }
  });

  it("rejects I-4 (physicalLoopCopies < 5)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    c.motion.physical.physicalLoopCopies = 4;
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-4");
    }
  });

  it("rejects I-5 (initialPhysicalCycle <= 0)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    c.motion.physical.initialPhysicalCycle = 0;
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-5");
    }
  });

  it("rejects I-6 (initialPhysicalCycle >= physicalLoopCopies - 1)", () => {
    const c = cloneConfig(defaultSpatialConfig);
    c.motion.physical.initialPhysicalCycle = 6; // == physicalLoopCopies - 1
    const r = validateSpatialConfig(c);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues.map((i) => i.code)).toContain("I-6");
    }
  });
});

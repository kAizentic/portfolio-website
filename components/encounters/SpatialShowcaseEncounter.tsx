"use client";

/**
 * SpatialShowcaseEncounter — first generic composition demonstrating the
 * depth-passage content model.
 *
 * Layout (intentionally restrained for spatial proof):
 *   ┌──────────────────────────────────────┐
 *   │              [ 01 ]                  │  ← headline strip (rotateY scoped here)
 *   │                                      │
 *   │  ┌────────────────────────────────┐  │
 *   │  │       MEDIA PLATE              │  │  ← primary passage transform only
 *   │  │       (placeholder)            │  │
 *   │  └────────────────────────────────┘  │
 *   │                                      │
 *   │  metric · 03.4 ms · sample           │  ← supporting metric (stagger +1)
 *   │  caption text · placeholder          │  ← caption (stagger +2, opposite lateral)
 *   └──────────────────────────────────────┘
 *
 * The component is driven by a single `rel: number` (signed camera distance
 * to this encounter's anchor) and applies the asymmetric content-passage
 * mapping from `lib/content-passage.ts`. It does NOT consume the spatial
 * controller directly — it is a pure function of `rel` and `reducedMotion`,
 * so it works identically inside the live SceneFrame and inside the lab.
 *
 * Only the HEADLINE plane carries the optional rotateY effect (per brief:
 * "restrained optional rotation for one media plane or headline only").
 * Lateral offset is used on the caption for a subtle stagger; everything
 * else is primary passage transform (scale + opacity + blur).
 */

import { motion } from "motion/react";

import { contentPassageTokens } from "@/config/content-passage-tokens";
import {
  contentMappingFromRel,
  elementStaggerSeconds,
} from "@/lib/content-passage";

export interface SpatialShowcaseEncounterProps {
  /** Display label (e.g. "01"). */
  label: string;
  /** Long-form caption shown under the metric. */
  caption?: string;
  /** Sampled relative depth from camera → equivalent anchor. */
  rel: number;
  /** Reduce-motion flag (skips scale / blur / rotation / lateral). */
  reducedMotion: boolean;
  /** Optional test id prefix so multiple encounters can be queried. */
  testIdPrefix?: string;
}

export function SpatialShowcaseEncounter({
  label,
  caption = "Placeholder caption — spatial proof composition.",
  rel,
  reducedMotion,
  testIdPrefix = "showcase",
}: SpatialShowcaseEncounterProps): React.JSX.Element {
  const mapping = contentMappingFromRel(rel, contentPassageTokens, reducedMotion);
  const stagger1 = elementStaggerSeconds(1, contentPassageTokens, reducedMotion);
  const stagger2 = elementStaggerSeconds(2, contentPassageTokens, reducedMotion);

  const filter =
    mapping.blurPx <= 0.05 ? "none" : `blur(${mapping.blurPx.toFixed(2)}px)`;

  return (
    <motion.div
      data-testid={`${testIdPrefix}-encounter`}
      data-passage-phase={mapping.phase}
      data-passage-scale={mapping.scale.toFixed(4)}
      data-passage-opacity={mapping.opacity.toFixed(4)}
      data-passage-blur={mapping.blurPx.toFixed(2)}
      data-passage-rel={rel.toFixed(2)}
      className="select-none flex flex-col items-center gap-5 px-8 py-7"
      style={{
        scale: mapping.scale,
        opacity: mapping.opacity,
        filter,
        translateX: mapping.lateralPx,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity, filter",
        minWidth: 380,
        maxWidth: 560,
      }}
    >
      <motion.div
        data-testid={`${testIdPrefix}-encounter-headline`}
        className="font-mono text-[52px] font-semibold tracking-[0.26em] text-white"
        style={{
          rotateY: mapping.rotateYDeg,
          transformPerspective: 1200,
          transformStyle: "preserve-3d",
        }}
      >
        {label}
      </motion.div>

      <div
        data-testid={`${testIdPrefix}-encounter-media-plate`}
        className="relative w-full"
        style={{ aspectRatio: "16 / 10" }}
      >
        <div
          className="absolute inset-0 rounded-md border border-white/20"
          style={{
            background:
              "linear-gradient(135deg, rgba(120,135,170,0.18) 0%, rgba(80,95,130,0.10) 50%, rgba(40,50,75,0.20) 100%)",
            boxShadow:
              "inset 0 0 60px rgba(180,200,235,0.08), inset 0 0 12px rgba(180,200,235,0.16)",
          }}
        />
        <div
          className="absolute inset-x-6 top-6 h-px"
          style={{
            background:
              "linear-gradient(to right, rgba(180,200,235,0.0), rgba(180,200,235,0.4) 50%, rgba(180,200,235,0.0))",
          }}
        />
        <div
          className="absolute inset-x-6 bottom-6 h-px"
          style={{
            background:
              "linear-gradient(to right, rgba(180,200,235,0.0), rgba(180,200,235,0.4) 50%, rgba(180,200,235,0.0))",
          }}
        />
      </div>

      <div
        data-testid={`${testIdPrefix}-encounter-metric`}
        className="font-mono text-[12px] uppercase tracking-[0.26em] text-white/65"
        style={{
          transitionDelay: `${stagger1}s`,
        }}
      >
        metric · sample · placeholder
      </div>

      <motion.div
        data-testid={`${testIdPrefix}-encounter-caption`}
        className="font-mono text-[11px] leading-relaxed text-white/55"
        style={{
          transitionDelay: `${stagger2}s`,
          translateX: -mapping.lateralPx * 0.5,
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        {caption}
      </motion.div>
    </motion.div>
  );
}

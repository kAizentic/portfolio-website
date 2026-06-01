/**
 * Spacing, atmospheric falloff, parallax depth, docking and rail-travel
 * timing tokens for the rail-camera prototype.
 *
 * All Lenis durations are in SECONDS. Every programmatic scrollTo call goes
 * through `programmaticScrollOptions` in `useSpatialController` and combines
 * the duration/easing here with an explicit `lerp: 0`, so duration is the
 * authoritative animation driver.
 *
 * The defaults below satisfy the configuration invariants in
 * `lib/config-validation.ts` (I-1…I-6). Change with care.
 *
 * Loop arithmetic check (with the defaults):
 *   sceneGap = 1000, scenes.length = 6  ⇒  L = 6000
 *   windowRadius = 1800                 ⇒  windowRadius < L/2 = 3000   ✓ I-1
 *   focusEpsilon = 220                  ⇒  focusEpsilon < sceneGap/2 = 500 ✓ I-2
 *   translateZAt.focus = 0                                              ✓ I-3
 *   physicalLoopCopies = 7              ⇒  ≥ 5                          ✓ I-4
 *   initialPhysicalCycle = 3            ⇒  > 0, < 6                     ✓ I-5/I-6
 */

import {
  easeInOutQuint,
  easeOutCubic,
  easeOutExpo,
  easeOutQuart,
} from "@/lib/easing";
import type { MotionTokens } from "@/types/spatial";

export const motionTokens: MotionTokens = {
  sceneGap: 1000,
  pxPerDepthUnit: 1.5,
  focalPlane: 0,
  windowRadius: 1800,
  focusEpsilon: 220,
  perspective: 1400,

  physical: {
    physicalLoopCopies: 7,
    initialPhysicalCycle: 3,
    safeBandHalfWidth: 1,
  },

  scaleAt: { focus: 1, far: 0.55 },
  opacityAt: { focus: 1, far: 0 },
  blurPxAt: { focus: 0, far: 14 },
  translateZAt: { focus: 0, far: 600 },

  snap: {
    mode: "nearest",
    directionalBiasEnabled: false,
    velocityThreshold: 0.6,
    idleDelaySeconds: 0.18,
    durationSeconds: 0.5,
    easing: easeOutCubic,
  },

  menuTravel: {
    /** One-scene menu hops stay near ~0.8s total (base + perScene). */
    baseDurationSeconds: 0.52,
    /** Extra time per scene-step for clearer multi-anchor accel/decel. */
    perSceneDurationSeconds: 0.32,
    maxDurationSeconds: 1.65,
    easing: easeInOutQuint,
  },

  keyboard: {
    durationSeconds: 0.65,
    easing: easeOutQuart,
  },

  reducedMotion: {
    transitionSeconds: 0.16,
    disableContinuousScale: true,
    disableContinuousBlur: true,
  },

  /**
   * Manual wheel/touch: exploratory departure, directional commitment at
   * commitThresholdRatio, then assisted ease-out arrival. Menu/keyboard
   * tokens are unchanged.
   */
  manualTravel: {
    /** Lenis wheelMultiplier (was implicit 1.0). Raises px/scroll without sceneGap changes. */
    inputGain: 1.35,
    /** Default −1: scrolling UP advances forward (rail-camera convention). */
    forwardScrollSign: -1,
    commitThresholdRatio: 0.22,
    /** ~0.72s: visible brake into dock; faster than menu hops, slower than old 0.5s snap. */
    assistedDockDurationSeconds: 0.72,
    assistedDockEasing: easeOutExpo,
    allowOppositeInputCancellation: true,
  },

  landingHold: {
    enabled: true,
    minimumHoldSeconds: 0.32,
    inputQuietWindowSeconds: 0.12,
    /** virtual-scroll deltaY px/event; above momentum tail, below deliberate notch. */
    departureIntentThreshold: 42,
    applyAfterAssistedDocking: true,
    applyAfterMenuTravel: true,
    applyAfterKeyboardTravel: true,
    /** ~1 frame at 60fps; blocks carry-through without felt pause in reduce mode. */
    minimumHoldSecondsReducedMotion: 0.05,
    inputQuietWindowSecondsReducedMotion: 0.06,
    departureBufferEnabled: true,
    /** Deliberate accumulated virtual-scroll px before leaving docked hold. */
    departureBufferThresholdPx: 180,
    departureBufferDecaySeconds: 0.2,
    /** Initial carried-forward fraction of buffered scroll (prevents lurch). */
    departureReleaseImpulseRatio: 0.35,
    /** Lower resistance in reduce mode (~2 deliberate notches vs ~4–5). */
    departureBufferThresholdPxReducedMotion: 72,
  },
};

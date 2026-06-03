/**
 * Pure depth math for the rail-camera spatial template.
 *
 * Concepts:
 *   travelDepth        — camera's continuous logical position along the rail.
 *   wrappedDepth       — camera's position within the current loop, ∈ [0, L).
 *   baseAnchorDepth    — an encounter anchor's nominal position (anchorIndex * sceneGap).
 *   equivalentAnchor   — the nearest representative of that anchor on the
 *                        looped rail relative to the current camera position.
 *   relativeDepth      — signed distance from camera to equivalent anchor;
 *                        always in (−L/2, L/2] by construction.
 *
 * All functions are pure and side-effect-free so they can be unit-tested in
 * isolation and reused identically by manual scroll, docking, menu travel
 * and keyboard travel — the corrections explicitly require this.
 */

import type { MotionTokens, SceneManifestEntry } from "@/types/spatial";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Total depth-unit circumference of one rail loop. */
export const loopLength = (
  scenes: ReadonlyArray<SceneManifestEntry>,
  sceneGap: number
): number => scenes.length * sceneGap;

/** Pixel circumference of one rail loop. */
export const loopLengthPx = (loopLengthValue: number, pxPerDepthUnit: number): number =>
  loopLengthValue * pxPerDepthUnit;

/**
 * Camera travel depth from Lenis's animated scroll coordinate.
 *
 *   travelDepth = renderScrollPx / pxPerDepthUnit + rebaseOffsetDepth
 *
 * `rebaseOffsetDepth` accumulates each time the rail is silently recentered
 * onto its safe band; that keeps `travelDepth` continuous across rebases.
 */
export const travelDepthFrom = (
  renderScrollPx: number,
  rebaseOffsetDepth: number,
  pxPerDepthUnit: number
): number => renderScrollPx / pxPerDepthUnit + rebaseOffsetDepth;

/**
 * Translate a logical depth back into the Lenis scroll coordinate that
 * currently represents it.
 *
 *   physicalScrollPx = (logicalDepth − rebaseOffsetDepth) * pxPerDepthUnit
 *
 * Used to convert the result of `closestEquivalentAnchor` into a target px
 * for `lenis.scrollTo`.
 */
export const depthToRenderScrollPx = (
  logicalDepth: number,
  rebaseOffsetDepth: number,
  pxPerDepthUnit: number
): number => (logicalDepth - rebaseOffsetDepth) * pxPerDepthUnit;

/**
 * Pure rebase calculation. Returns the post-rebase values without touching
 * Lenis or any React state, so the math can be unit-tested in isolation and
 * the controller can call this synchronously inside its atomic rebase.
 *
 * Invariant: `travelDepth = renderScrollPx / pxPerDU + rebaseOffsetDepth`
 * is preserved exactly through the shift, because `physicalDepth` increases
 * by `shiftCycles * L` while `rebaseOffsetDepth` decreases by the same
 * amount.
 */
export interface ComputedRebase {
  /** Difference between target central cycle and current cycle (signed). */
  shiftCycles: number;
  /** New Lenis scroll coordinate after the silent jump. */
  newRenderScrollPx: number;
  /** Updated rebase offset that preserves travelDepth across the jump. */
  newRebaseOffsetDepth: number;
  /** travelDepth read at the post-rebase coordinates (== pre-rebase travelDepth). */
  newTravelDepth: number;
}

export const computeRebase = (
  renderScrollPx: number,
  rebaseOffsetDepth: number,
  pxPerDepthUnit: number,
  loopLengthValue: number,
  loopLengthPxValue: number,
  initialPhysicalCycle: number
): ComputedRebase => {
  const currentCycle = Math.floor(renderScrollPx / loopLengthPxValue);
  const shiftCycles = initialPhysicalCycle - currentCycle;
  const newRenderScrollPx = renderScrollPx + shiftCycles * loopLengthPxValue;
  const newRebaseOffsetDepth =
    rebaseOffsetDepth - shiftCycles * loopLengthValue;
  const newTravelDepth =
    newRenderScrollPx / pxPerDepthUnit + newRebaseOffsetDepth;
  return {
    shiftCycles,
    newRenderScrollPx,
    newRebaseOffsetDepth,
    newTravelDepth,
  };
};

/**
 * Wrap a depth into the half-open interval [0, L).
 *
 * Correct for negative inputs because JS's `%` returns the sign of the
 * dividend; we add L then mod again.
 */
export const wrap = (depth: number, loopLengthValue: number): number => {
  const m = depth % loopLengthValue;
  return (m + loopLengthValue) % loopLengthValue;
};

/**
 * Pick the equivalent of `baseAnchorDepth` whose absolute distance from the
 * current camera position is smallest on the looped rail.
 *
 *   k = round((currentTravelDepth − baseAnchorDepth) / L)
 *   return baseAnchorDepth + k * L
 *
 * Returned value is a non-wrapped absolute logical depth. Subtract
 * `currentTravelDepth` to get a signed relative distance in (−L/2, L/2].
 *
 * Tie-breaking: `Math.round` rounds halves toward +∞, so the tie at
 * |rel| = L/2 resolves to the equivalent in the +L direction. This matches
 * unit test U-2.
 */
export const closestEquivalentAnchor = (
  currentTravelDepth: number,
  baseAnchorDepth: number,
  loopLengthValue: number
): number => {
  const k = Math.round(
    (currentTravelDepth - baseAnchorDepth) / loopLengthValue
  );
  return baseAnchorDepth + k * loopLengthValue;
};

/** Signed distance from camera to the equivalent anchor. */
export const relativeDepth = (
  equivalentAnchorDepth: number,
  currentTravelDepth: number
): number => equivalentAnchorDepth - currentTravelDepth;

/** Result of nearest-only snap target selection (snap.mode === "nearest"). */
export interface NearestSnapAnchorTarget {
  anchorIndex: number;
  equivalentAnchorDepth: number;
}

/**
 * Nearest-only snap target: the encounter anchor whose equivalent position
 * on the looped rail is closest to `travelDepth`, plus that equivalent depth.
 *
 * Shared by SpatialControllerProvider.maybeFireSnap and DiagnosticOverlay
 * (dock target candidate). Tie-breaking: lowest `anchorIndex` wins when two
 * anchors are equally close (`absRel` compared with strict `<`).
 */
export const nearestSnapAnchorTarget = (
  travelDepth: number,
  scenes: ReadonlyArray<{ anchorIndex: number }>,
  sceneGap: number,
  loopLengthValue: number
): NearestSnapAnchorTarget => {
  let bestAbs = Infinity;
  let bestIndex = 0;
  let bestEq = 0;
  for (let i = 0; i < scenes.length; i++) {
    const base = scenes[i].anchorIndex * sceneGap;
    const eq = closestEquivalentAnchor(travelDepth, base, loopLengthValue);
    const absRel = Math.abs(eq - travelDepth);
    if (absRel < bestAbs) {
      bestAbs = absRel;
      bestIndex = i;
      bestEq = eq;
    }
  }
  return { anchorIndex: bestIndex, equivalentAnchorDepth: bestEq };
};

/** Signed departure from the last docked encounter: (travel − dockEq) / sceneGap. */
export const departureRatioFromLastDock = (
  travelDepth: number,
  lastDockedAnchorIndex: number,
  sceneGap: number,
  loopLengthValue: number
): number => {
  const dockEq = closestEquivalentAnchor(
    travelDepth,
    lastDockedAnchorIndex * sceneGap,
    loopLengthValue
  );
  return (travelDepth - dockEq) / sceneGap;
};

/** Next/previous encounter index on the circular manifest (wraps 06↔01). */
export const adjacentEncounterIndex = (
  fromIndex: number,
  direction: -1 | 1,
  sceneCount: number
): number => (fromIndex + direction + sceneCount) % sceneCount;

/** Target for assisted docking after directional commitment crosses the threshold. */
export interface AssistedDockTarget {
  anchorIndex: number;
  equivalentAnchorDepth: number;
}

/**
 * Adjacent encounter in `direction` from `lastDockedAnchorIndex`, using the
 * same pivot + closestEquivalentAnchor pattern as keyboard step travel.
 */
export const assistedDockTargetFromCommitment = (
  travelDepth: number,
  lastDockedAnchorIndex: number,
  direction: -1 | 1,
  scenes: ReadonlyArray<{ anchorIndex: number }>,
  sceneGap: number,
  loopLengthValue: number
): AssistedDockTarget => {
  const dockEq = closestEquivalentAnchor(
    travelDepth,
    lastDockedAnchorIndex * sceneGap,
    loopLengthValue
  );
  const nextIndex = adjacentEncounterIndex(
    lastDockedAnchorIndex,
    direction,
    scenes.length
  );
  const pivot = dockEq + direction * sceneGap;
  const base = scenes[nextIndex].anchorIndex * sceneGap;
  const equivalentAnchorDepth = closestEquivalentAnchor(
    pivot,
    base,
    loopLengthValue
  );
  return { anchorIndex: nextIndex, equivalentAnchorDepth };
};

/** Return-to-dock target at the last docked encounter equivalent. */
export const returnToLastDockTarget = (
  travelDepth: number,
  lastDockedAnchorIndex: number,
  sceneGap: number,
  loopLengthValue: number
): AssistedDockTarget => {
  const equivalentAnchorDepth = closestEquivalentAnchor(
    travelDepth,
    lastDockedAnchorIndex * sceneGap,
    loopLengthValue
  );
  return {
    anchorIndex: lastDockedAnchorIndex,
    equivalentAnchorDepth,
  };
};

/** Index-only view of {@link nearestSnapAnchorTarget} for diagnostic display. */
export const nearestSnapAnchorIndex = (
  travelDepth: number,
  scenes: ReadonlyArray<{ anchorIndex: number }>,
  sceneGap: number,
  loopLengthValue: number
): number =>
  nearestSnapAnchorTarget(travelDepth, scenes, sceneGap, loopLengthValue)
    .anchorIndex;

/** Visual mapping result for a single encounter anchor in the current frame. */
export interface VisualMapping {
  opacity: number;
  scale: number;
  blurPx: number;
  translateZ: number;
  pointerEvents: "auto" | "none";
}

/**
 * Atmospheric falloff and parallax curves keyed on the camera's distance
 * from this anchor. Continuous mode used outside reduced motion.
 */
export const visualMapping = (
  rel: number,
  tokens: Pick<
    MotionTokens,
    | "windowRadius"
    | "opacityFalloffExponent"
    | "focusEpsilon"
    | "opacityAt"
    | "scaleAt"
    | "blurPxAt"
    | "translateZAt"
  >
): VisualMapping => {
  const absRel = Math.abs(rel);
  const t = clamp(absRel / tokens.windowRadius, 0, 1);
  // Opacity uses a convex curve (t^p) so the midpoint between anchors stays
  // covered; scale/blur/translateZ keep the linear `t`.
  const tOpacity = Math.pow(t, tokens.opacityFalloffExponent);
  const opacity = lerp(tokens.opacityAt.focus, tokens.opacityAt.far, tOpacity);
  const scale = lerp(tokens.scaleAt.focus, tokens.scaleAt.far, t);
  const blurPx = lerp(tokens.blurPxAt.focus, tokens.blurPxAt.far, t);
  const translateZMagnitude = lerp(
    tokens.translateZAt.focus,
    tokens.translateZAt.far,
    t
  );
  const translateZ = rel === 0 ? 0 : translateZMagnitude * Math.sign(rel);
  const pointerEvents: "auto" | "none" =
    absRel < tokens.focusEpsilon ? "auto" : "none";
  return { opacity, scale, blurPx, translateZ, pointerEvents };
};

/**
 * Reduced-motion mapping. Continuous scale/blur are pinned to focus values;
 * translateZ is suppressed. Opacity still attenuates so the user can locate
 * the focused encounter, and pointer-events still gates interaction.
 */
export const visualMappingReducedMotion = (
  rel: number,
  tokens: Pick<
    MotionTokens,
    | "windowRadius"
    | "opacityFalloffExponent"
    | "focusEpsilon"
    | "opacityAt"
    | "scaleAt"
    | "blurPxAt"
  >
): VisualMapping => {
  const absRel = Math.abs(rel);
  const t = clamp(absRel / tokens.windowRadius, 0, 1);
  const tOpacity = Math.pow(t, tokens.opacityFalloffExponent);
  const opacity = lerp(tokens.opacityAt.focus, tokens.opacityAt.far, tOpacity);
  const pointerEvents: "auto" | "none" =
    absRel < tokens.focusEpsilon ? "auto" : "none";
  return {
    opacity,
    scale: tokens.scaleAt.focus,
    blurPx: tokens.blurPxAt.focus,
    translateZ: 0,
    pointerEvents,
  };
};

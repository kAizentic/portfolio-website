"use client";

/**
 * Spatial controller context, provider and consumer hooks.
 *
 * Rail-camera model:
 *   The provider is the single source of truth for camera state along the
 *   rail. It reads Lenis's animated scroll on every tick, translates that
 *   into continuous logical travel depth, computes per-anchor relative
 *   depths, drives a single `travelDepth` MotionValue, and arbitrates the
 *   four navigation modes (manual / docking / menu / keyboard).
 *
 * Architecture notes:
 *   - High-frequency mutable state lives in refs (no React re-render).
 *   - One `travelDepth` MotionValue is published; each SceneFrame derives
 *     its own visual properties via useTransform on that single source.
 *     This keeps the render path off React for animation work.
 *   - Low-frequency derived state (focusedAnchorIndex, navigationState,
 *     reducedMotion, initialized, manualDockPending) is React state so
 *     consumers like SceneNav and DiagnosticOverlay can render conditionally.
 *   - A throttled diagnostic snapshot is published at ~30 fps only when
 *     `showDiagnostics` is true.
 *   - All four input modes converge on a single helper,
 *     `programmaticScrollOptions`, which combines `{ duration, easing }`
 *     with an explicit `lerp: 0` so Lenis's duration-based animation path
 *     is always authoritative (see lenis.mjs Animate.advance: it prefers
 *     duration+easing over lerp). Manual wheel/touch still uses the default
 *     instance lerp because it goes through Lenis's own internal scrollTo
 *     with `programmatic: false`.
 *   - `useLayoutEffect` performs the central-cycle rebase + ref priming
 *     before scene surfaces reveal, preventing initialization flash.
 */

import { useLenis } from "lenis/react";
import { MotionValue, useMotionValue } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  assistedDockTargetFromCommitment,
  clamp,
  closestEquivalentAnchor,
  computeRebase,
  departureRatioFromLastDock,
  depthToRenderScrollPx,
  loopLength as computeLoopLength,
  loopLengthPx as computeLoopLengthPx,
  returnToLastDockTarget,
  wrap,
} from "@/lib/depth-math";
import type { AssistedDockTarget } from "@/lib/depth-math";
import { linear } from "@/lib/easing";
import {
  accumulateDepartureBufferPx,
  decayDepartureBufferPx,
  departureBufferDirection,
  departureRatioSeedFromBuffer,
  departureReleaseImpulseVirtualPx,
  effectiveDepartureBufferThresholdPx,
  effectiveInputQuietWindowSeconds,
  effectiveMinimumHoldSeconds,
  holdRemainingSeconds,
  isDepartureBufferReleaseReady,
  isMinimumHoldSatisfied,
  isResidualScrollInput,
  shouldApplyLandingHold,
  type LandingHoldArrivalSource,
} from "@/lib/landing-hold";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type {
  ControllerActions,
  ControllerState,
  NavigationState,
  RebaseResult,
  SpatialConfig,
} from "@/types/spatial";

import type { ScrollToOptions } from "lenis";

/**
 * Centralized Lenis scrollTo options for every programmatic camera move.
 *
 * Why `lerp: 0`:
 *   Lenis's internal `Animate.advance` checks `duration && easing` first
 *   and only falls back to lerp when those are absent. Passing
 *   `duration + easing` already wins, but `lerp: 0` makes the contract
 *   explicit so future maintainers cannot accidentally let the configured
 *   instance lerp (default 0.1) reintroduce indefinite interpolation.
 *
 *   Verified against lenis@1.3.23 lenis.mjs (Animate.advance) and the
 *   ScrollToOptions typedef in lenis.d.ts.
 */
const programmaticScrollOptions = (opts: {
  durationSeconds: number;
  easing: (t: number) => number;
  lock?: boolean;
  force?: boolean;
  onComplete?: () => void;
  userData?: Record<string, unknown>;
}): ScrollToOptions => ({
  duration: opts.durationSeconds,
  easing: opts.easing,
  lerp: 0,
  lock: opts.lock ?? true,
  force: opts.force ?? true,
  onComplete: opts.onComplete ? () => opts.onComplete?.() : undefined,
  userData: opts.userData,
  programmatic: true,
});

/** Immediate (no animation) scrollTo, used for rebase and cancel. */
const immediateScrollOptions = (
  userData?: Record<string, unknown>
): ScrollToOptions => ({
  immediate: true,
  force: true,
  lerp: 0,
  userData,
});

/**
 * Throttled snapshot of controller state for the diagnostic overlay. Only
 * the fields the rail telemetry surfaces actually need. Updated at ~30 fps.
 */
export interface DiagnosticSnapshot {
  renderScrollPx: number;
  targetScrollPx: number;
  rebaseOffsetDepth: number;
  travelDepth: number;
  wrappedDepth: number;
  physicalCycle: number;
  loopCycle: number;
  focusedAnchorIndex: number;
  nearestAnchorIndex: number;
  navigationState: NavigationState;
  direction: -1 | 0 | 1;
  velocity: number;
  manualDockPending: boolean;
  reducedMotion: boolean;
  lastDockedAnchorIndex: number;
  departureRatio: number;
  departureDirection: -1 | 0 | 1;
  committedDockTargetIndex: number | null;
  dockedHoldStartMs: number;
  dockedHoldPinScrollPx: number;
  lastWheelInputMs: number;
  holdRemainingSeconds: number;
  inputQuiet: boolean;
  departureIntentDetected: boolean;
  dockedHoldGatesOpen: boolean;
  departureBufferPx: number;
  departureBufferThresholdPx: number;
  departureBufferDirection: -1 | 0 | 1;
  departureBufferThresholdReached: boolean;
  residualInputFiltered: boolean;
}

export interface SpatialControllerContextValue {
  config: SpatialConfig;
  loopLength: number;
  loopLengthPx: number;
  totalHeightPx: number;
  state: Pick<
    ControllerState,
    | "initialized"
    | "focusedAnchorIndex"
    | "navigationState"
    | "manualDockPending"
    | "reducedMotion"
  >;
  actions: ControllerActions;
  /** Single source MotionValue for current rail camera travel depth. */
  travelDepth: MotionValue<number>;
  /** Diagnostic snapshot (only updated when `config.showDiagnostics`). */
  diagnostic: DiagnosticSnapshot | null;
}

const SpatialControllerContext =
  createContext<SpatialControllerContextValue | null>(null);

export const useSpatialController = (): SpatialControllerContextValue => {
  const ctx = useContext(SpatialControllerContext);
  if (!ctx) {
    throw new Error(
      "useSpatialController must be used inside <SpatialControllerProvider>"
    );
  }
  return ctx;
};

/**
 * Provider. Mounts inside <ReactLenis> so `useLenis` returns the live
 * instance. Performs the atomic central-cycle rebase + scene reveal during
 * useLayoutEffect to avoid initialization flash.
 */
export const SpatialControllerProvider = ({
  config,
  children,
}: {
  config: SpatialConfig;
  children: ReactNode;
}): React.JSX.Element => {
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();

  // ----- derived constants (stable per config) -----
  const {
    sceneGap,
    pxPerDepthUnit,
    focusEpsilon,
    manualTravel,
    landingHold,
    physical: { physicalLoopCopies, initialPhysicalCycle, safeBandHalfWidth },
  } = config.motion;
  const scenes = config.scenes;

  const { loopLength, loopLengthPxValue, totalHeightPx, safeCycleMin, safeCycleMax, initialScrollPx } =
    useMemo(() => {
      const L = computeLoopLength(scenes, sceneGap);
      const Lpx = computeLoopLengthPx(L, pxPerDepthUnit);
      const total = physicalLoopCopies * Lpx;
      return {
        loopLength: L,
        loopLengthPxValue: Lpx,
        totalHeightPx: total,
        safeCycleMin: initialPhysicalCycle - safeBandHalfWidth,
        safeCycleMax: initialPhysicalCycle + safeBandHalfWidth,
        initialScrollPx: initialPhysicalCycle * Lpx,
      };
    }, [
      scenes,
      sceneGap,
      pxPerDepthUnit,
      physicalLoopCopies,
      initialPhysicalCycle,
      safeBandHalfWidth,
    ]);

  // ----- single-source MotionValue for all SceneFrame derivations -----
  const travelDepth = useMotionValue(0);

  // ----- ref-only state (no re-render on every Lenis tick) -----
  // Note: `initialized` is mirrored here (alongside the React state) so the
  // test bridge can observe it without prop-drilling and so the per-tick
  // callback can short-circuit before the initial paint.
  const refs = useRef({
    initialized: false,
    renderScrollPx: initialScrollPx,
    targetScrollPx: initialScrollPx,
    physicalCycle: initialPhysicalCycle,
    rebaseOffsetDepth: -initialPhysicalCycle * loopLength,
    travelDepth: 0,
    wrappedDepth: 0,
    loopCycle: 0,
    focusedAnchorIndex: 0,
    nearestAnchorIndex: 0,
    direction: 0 as -1 | 0 | 1,
    velocity: 0,
    navigationState: "idle" as NavigationState,
    manualDockPending: false,
    reducedMotion: false,
    lastDockedAnchorIndex: 0,
    departureRatio: 0,
    departureDirection: 0 as -1 | 0 | 1,
    committedDockTargetIndex: null as number | null,
    /** After opposite cancel, block re-commit until user retreats below half-threshold. */
    manualCommitHoldoff: false,
    lastTickMs: 0,
    lastDiagnosticPublishMs: 0,
    manualIdleTimer: null as ReturnType<typeof setTimeout> | null,
    dockedHoldStartMs: 0,
    dockedHoldPinScrollPx: initialScrollPx,
    lastWheelInputMs: 0,
    departureIntentDetected: false,
    dockedHoldGatesOpen: false,
    departureBufferPx: 0,
    residualInputFiltered: false,
    /** Test jumps and other programmatic seeks skip auto-commit until real wheel input. */
    suppressAutoCommit: false,
    /** Active assisted-dock target (for settle detection when Lenis onComplete is lost). */
    assistedDockTargetAnchorIndex: null as number | null,
    assistedDockTargetPx: null as number | null,
    /** Ignore departure-buffer accumulation until this time (post-arrival momentum). */
    departureBufferLockUntilMs: 0,
    /** Block assisted re-commit until this time (after landing at an anchor). */
    postDockCommitLockUntilMs: 0,
    assistedDockSnapStartMs: 0,
    /** Menu/keyboard arrival anchor (onComplete must not use transient focus). */
    programmaticArrivalAnchorIndex: 0,
  });

  // ----- React state (low-frequency, consumer-render-triggering) -----
  const [initialized, setInitialized] = useState(false);
  const [navigationState, setNavigationState] =
    useState<NavigationState>("idle");
  const [focusedAnchorIndex, setFocusedAnchorIndex] = useState(0);
  const [manualDockPending, setManualDockPending] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticSnapshot | null>(null);

  useEffect(() => {
    refs.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  // ----- focus / nav publication helpers -----
  const publishFocus = useCallback((focus: number) => {
    if (refs.current.focusedAnchorIndex !== focus) {
      refs.current.focusedAnchorIndex = focus;
      refs.current.nearestAnchorIndex = focus;
      setFocusedAnchorIndex(focus);
    }
  }, []);

  const publishNavigationState = useCallback((next: NavigationState) => {
    if (refs.current.navigationState !== next) {
      refs.current.navigationState = next;
      setNavigationState(next);
    }
  }, []);

  const publishManualDockPending = useCallback((next: boolean) => {
    if (refs.current.manualDockPending !== next) {
      refs.current.manualDockPending = next;
      setManualDockPending(next);
    }
  }, []);

  // ----- per-tick derivation of focused anchor + diagnostic snapshot -----
  const updateDerivedFromTravelDepth = useCallback(
    (depth: number, publishDiagnostic: boolean) => {
      let bestAbs = Infinity;
      let focus = 0;
      for (let i = 0; i < scenes.length; i++) {
        const base = scenes[i].anchorIndex * sceneGap;
        const eq = closestEquivalentAnchor(depth, base, loopLength);
        const rel = eq - depth;
        const absRel = Math.abs(rel);
        if (absRel < bestAbs) {
          bestAbs = absRel;
          focus = i;
        }
      }
      publishFocus(focus);

      if (
        refs.current.navigationState === "idle" &&
        bestAbs < focusEpsilon
      ) {
        refs.current.lastDockedAnchorIndex = focus;
        refs.current.departureRatio = 0;
        refs.current.departureDirection = 0;
      }

      if (publishDiagnostic && config.showDiagnostics) {
        const now = performance.now();
        if (now - refs.current.lastDiagnosticPublishMs > 33) {
          refs.current.lastDiagnosticPublishMs = now;
          setDiagnostic({
            renderScrollPx: refs.current.renderScrollPx,
            targetScrollPx: refs.current.targetScrollPx,
            rebaseOffsetDepth: refs.current.rebaseOffsetDepth,
            travelDepth: refs.current.travelDepth,
            wrappedDepth: refs.current.wrappedDepth,
            physicalCycle: refs.current.physicalCycle,
            loopCycle: refs.current.loopCycle,
            focusedAnchorIndex: refs.current.focusedAnchorIndex,
            nearestAnchorIndex: refs.current.nearestAnchorIndex,
            navigationState: refs.current.navigationState,
            direction: refs.current.direction,
            velocity: refs.current.velocity,
            manualDockPending: refs.current.manualDockPending,
            reducedMotion: refs.current.reducedMotion,
            lastDockedAnchorIndex: refs.current.lastDockedAnchorIndex,
            departureRatio: refs.current.departureRatio,
            departureDirection: refs.current.departureDirection,
            committedDockTargetIndex: refs.current.committedDockTargetIndex,
            dockedHoldStartMs: refs.current.dockedHoldStartMs,
            dockedHoldPinScrollPx: refs.current.dockedHoldPinScrollPx,
            lastWheelInputMs: refs.current.lastWheelInputMs,
            holdRemainingSeconds:
              refs.current.navigationState === "dockedHold"
                ? holdRemainingSeconds(
                    refs.current.dockedHoldStartMs,
                    now,
                    effectiveMinimumHoldSeconds(
                      refs.current.reducedMotion,
                      landingHold
                    )
                  )
                : 0,
            inputQuiet:
              refs.current.navigationState === "dockedHold"
                ? now - refs.current.lastWheelInputMs >=
                  effectiveInputQuietWindowSeconds(
                    refs.current.reducedMotion,
                    landingHold
                  ) *
                    1000
                : false,
            departureIntentDetected: refs.current.departureIntentDetected,
            dockedHoldGatesOpen: refs.current.dockedHoldGatesOpen,
            departureBufferPx: refs.current.departureBufferPx,
            departureBufferThresholdPx: effectiveDepartureBufferThresholdPx(
              refs.current.reducedMotion,
              landingHold
            ),
            departureBufferDirection: departureBufferDirection(
              refs.current.departureBufferPx
            ),
            departureBufferThresholdReached: isDepartureBufferReleaseReady(
              refs.current.departureBufferPx,
              effectiveDepartureBufferThresholdPx(
                refs.current.reducedMotion,
                landingHold
              )
            ),
            residualInputFiltered: refs.current.residualInputFiltered,
          });
        }
      }
    },
    [
      scenes,
      sceneGap,
      loopLength,
      focusEpsilon,
      landingHold,
      publishFocus,
      config.showDiagnostics,
    ]
  );

  // ----- atomic rebase to the central rail cycle -----
  const rebaseToCentralCycleIfNeeded = useCallback((): RebaseResult => {
    const lenisInstance = lenis;
    const r = refs.current;
    if (!lenisInstance) {
      return {
        renderScrollPx: r.renderScrollPx,
        rebaseOffsetDepth: r.rebaseOffsetDepth,
        travelDepth: r.travelDepth,
      };
    }
    const renderScrollPx = lenisInstance.animatedScroll;
    const rebased = computeRebase(
      renderScrollPx,
      r.rebaseOffsetDepth,
      pxPerDepthUnit,
      loopLength,
      loopLengthPxValue,
      initialPhysicalCycle
    );
    if (rebased.shiftCycles === 0) {
      return {
        renderScrollPx,
        rebaseOffsetDepth: r.rebaseOffsetDepth,
        travelDepth: r.travelDepth,
      };
    }

    r.renderScrollPx = rebased.newRenderScrollPx;
    r.targetScrollPx = rebased.newRenderScrollPx;
    r.rebaseOffsetDepth = rebased.newRebaseOffsetDepth;
    r.travelDepth = rebased.newTravelDepth;
    r.wrappedDepth = wrap(rebased.newTravelDepth, loopLength);
    r.physicalCycle = initialPhysicalCycle;

    travelDepth.set(rebased.newTravelDepth);
    lenisInstance.scrollTo(
      rebased.newRenderScrollPx,
      immediateScrollOptions({ rebase: true })
    );

    return {
      renderScrollPx: rebased.newRenderScrollPx,
      rebaseOffsetDepth: rebased.newRebaseOffsetDepth,
      travelDepth: rebased.newTravelDepth,
    };
  }, [
    lenis,
    loopLengthPxValue,
    initialPhysicalCycle,
    loopLength,
    pxPerDepthUnit,
    travelDepth,
  ]);

  const ensureSafeCycle = useCallback(
    (): RebaseResult => rebaseToCentralCycleIfNeeded(),
    [rebaseToCentralCycleIfNeeded]
  );

  // ----- manual assisted docking -----

  const updateDepartureTracking = useCallback(() => {
    const r = refs.current;
    const ratio = departureRatioFromLastDock(
      r.travelDepth,
      r.lastDockedAnchorIndex,
      sceneGap,
      loopLength
    );
    r.departureRatio = ratio;
    if (ratio > 1e-6) r.departureDirection = 1;
    else if (ratio < -1e-6) r.departureDirection = -1;
    else r.departureDirection = 0;
  }, [sceneGap, loopLength]);

  const clearManualIdleTimer = useCallback(() => {
    if (refs.current.manualIdleTimer !== null) {
      clearTimeout(refs.current.manualIdleTimer);
      refs.current.manualIdleTimer = null;
    }
  }, []);

  const pinScrollPxForAnchor = useCallback(
    (anchorIndex: number, mode: "central" | "loopRelative" = "central") => {
      const r = refs.current;
      const anchorDepth =
        mode === "central"
          ? initialPhysicalCycle * loopLength + anchorIndex * sceneGap
          : closestEquivalentAnchor(
              r.travelDepth,
              anchorIndex * sceneGap,
              loopLength
            );
      return depthToRenderScrollPx(
        anchorDepth,
        r.rebaseOffsetDepth,
        pxPerDepthUnit
      );
    },
    [sceneGap, loopLength, pxPerDepthUnit, initialPhysicalCycle]
  );

  const pinToDockedHoldScroll = useCallback(
    (pinPx: number) => {
      if (!lenis) return;
      const r = refs.current;
      lenis.scrollTo(pinPx, immediateScrollOptions({ dockedHoldPin: true }));
      r.renderScrollPx = pinPx;
      r.targetScrollPx = pinPx;
      r.dockedHoldPinScrollPx = pinPx;
      r.travelDepth = pinPx / pxPerDepthUnit + r.rebaseOffsetDepth;
      r.wrappedDepth = wrap(r.travelDepth, loopLength);
      travelDepth.set(r.travelDepth);
    },
    [lenis, loopLength, pxPerDepthUnit, travelDepth]
  );

  const enterDockedHold = useCallback(
    (anchorIndex: number, source: LandingHoldArrivalSource) => {
      if (!shouldApplyLandingHold(source, landingHold)) {
        const r = refs.current;
        r.lastDockedAnchorIndex = anchorIndex;
        r.departureRatio = 0;
        r.departureDirection = 0;
        r.committedDockTargetIndex = null;
        publishManualDockPending(false);
        publishNavigationState("idle");
        return;
      }
      const r = refs.current;
      const now = performance.now();
      r.lastDockedAnchorIndex = anchorIndex;
      r.departureRatio = 0;
      r.departureDirection = 0;
      r.committedDockTargetIndex = null;
      r.departureIntentDetected = false;
      r.dockedHoldGatesOpen = false;
      r.departureBufferPx = 0;
      r.residualInputFiltered = false;
      r.manualCommitHoldoff = false;
      r.assistedDockTargetAnchorIndex = null;
      r.assistedDockTargetPx = null;
      const quietMs =
        effectiveInputQuietWindowSeconds(r.reducedMotion, landingHold) *
        1000;
      const minHoldMs =
        effectiveMinimumHoldSeconds(r.reducedMotion, landingHold) * 1000;
      r.departureBufferLockUntilMs = now + quietMs;
      r.postDockCommitLockUntilMs = now + minHoldMs + quietMs;
      r.dockedHoldStartMs = now;
      r.lastWheelInputMs = now;
      if (lenis) {
        lenis.scrollTo(
          lenis.animatedScroll,
          immediateScrollOptions({ kind: "enter-docked-hold-stop" })
        );
      }
      const pinMode =
        source === "assistedDock" ? "central" : "loopRelative";
      const pinPx = pinScrollPxForAnchor(anchorIndex, pinMode);
      pinToDockedHoldScroll(pinPx);
      publishFocus(anchorIndex);
      publishManualDockPending(false);
      publishNavigationState("dockedHold");
      const holdMs =
        effectiveMinimumHoldSeconds(r.reducedMotion, landingHold) * 1000;
      window.setTimeout(() => {
        if (refs.current.navigationState === "dockedHold") {
          refs.current.dockedHoldGatesOpen = true;
        }
      }, holdMs + 8);
    },
    [
      lenis,
      landingHold,
      pinScrollPxForAnchor,
      pinToDockedHoldScroll,
      publishFocus,
      publishManualDockPending,
      publishNavigationState,
    ]
  );

  const enterDockedHoldRef = useRef(enterDockedHold);
  useEffect(() => {
    enterDockedHoldRef.current = enterDockedHold;
  }, [enterDockedHold]);

  const finishAssistedDock = useCallback(
    (arrivedAnchorIndex: number) => {
      const r = refs.current;
      if (
        r.assistedDockTargetAnchorIndex !== null &&
        r.assistedDockTargetAnchorIndex !== arrivedAnchorIndex
      ) {
        return;
      }
      r.assistedDockTargetAnchorIndex = null;
      r.assistedDockTargetPx = null;
      r.assistedDockSnapStartMs = 0;
      r.committedDockTargetIndex = null;
      enterDockedHold(arrivedAnchorIndex, "assistedDock");
    },
    [enterDockedHold]
  );

  const startAssistedDock = useCallback(
    (target: AssistedDockTarget, kind: "commit" | "return") => {
      if (!lenis) return;
      const r = refs.current;
      if (r.navigationState === "menu" || r.navigationState === "keyboard") {
        return;
      }
      if (r.navigationState === "snapping") {
        return;
      }
      clearManualIdleTimer();

      /** Only skip animation when already numerically on the dock (not focus band). */
      const atDock =
        Math.abs(target.equivalentAnchorDepth - r.travelDepth) < 0.5;
      if (atDock) {
        finishAssistedDock(target.anchorIndex);
        return;
      }

      r.committedDockTargetIndex =
        kind === "commit" ? target.anchorIndex : null;
      if (kind === "commit") {
        r.departureDirection = (r.departureRatio > 0 ? 1 : -1) as -1 | 1;
        r.departureRatio =
          r.departureDirection *
          manualTravel.commitThresholdRatio;
      }

      const targetPx = depthToRenderScrollPx(
        target.equivalentAnchorDepth,
        r.rebaseOffsetDepth,
        pxPerDepthUnit
      );
      r.assistedDockTargetAnchorIndex = target.anchorIndex;
      r.assistedDockTargetPx = targetPx;

      let durationSeconds = manualTravel.assistedDockDurationSeconds;
      let easing = manualTravel.assistedDockEasing;
      if (r.reducedMotion) {
        durationSeconds = config.motion.reducedMotion.transitionSeconds;
        easing = linear;
      }

      r.assistedDockSnapStartMs = performance.now();
      publishNavigationState("snapping");
      lenis.scrollTo(
        targetPx,
        programmaticScrollOptions({
          durationSeconds,
          easing,
          lock: false,
          force: true,
          onComplete: () => finishAssistedDock(target.anchorIndex),
          userData: { kind: `assisted-dock:${kind}` },
        })
      );
    },
    [
      lenis,
      clearManualIdleTimer,
      manualTravel.assistedDockDurationSeconds,
      manualTravel.commitThresholdRatio,
      manualTravel.assistedDockEasing,
      config.motion.reducedMotion.transitionSeconds,
      pxPerDepthUnit,
      finishAssistedDock,
      publishNavigationState,
    ]
  );

  const clearManualCommitHoldoffIfRetreated = useCallback(() => {
    const r = refs.current;
    if (!r.manualCommitHoldoff) return;
    const half = manualTravel.commitThresholdRatio * 0.5;
    if (Math.abs(r.departureRatio) < half) {
      r.manualCommitHoldoff = false;
    }
  }, [manualTravel.commitThresholdRatio]);

  const tryCommitAssistedDock = useCallback(
    (skipDepartureUpdate = false, ignorePostDockLock = false) => {
    const r = refs.current;
    if (r.navigationState !== "manual") return;
    if (r.suppressAutoCommit) return;
    if (!r.manualDockPending) return;
    if (r.committedDockTargetIndex !== null) return;
    if (r.assistedDockTargetAnchorIndex !== null) return;
    if (
      !ignorePostDockLock &&
      performance.now() < r.postDockCommitLockUntilMs
    ) {
      return;
    }
    if (!skipDepartureUpdate) {
      updateDepartureTracking();
    }
    clearManualCommitHoldoffIfRetreated();
    if (r.manualCommitHoldoff) return;
    const threshold = manualTravel.commitThresholdRatio;
    if (Math.abs(r.departureRatio) < threshold) return;

    const direction = (r.departureRatio > 0 ? 1 : -1) as -1 | 1;
    const target = assistedDockTargetFromCommitment(
      r.travelDepth,
      r.lastDockedAnchorIndex,
      direction,
      scenes,
      sceneGap,
      loopLength
    );
    startAssistedDock(target, "commit");
  },
  [
    manualTravel.commitThresholdRatio,
    scenes,
    sceneGap,
    loopLength,
    startAssistedDock,
    updateDepartureTracking,
    clearManualCommitHoldoffIfRetreated,
  ]);

  const handleManualIdle = useCallback(() => {
    const r = refs.current;
    if (
      r.navigationState !== "manual" &&
      r.navigationState !== "idle" &&
      r.navigationState !== "dockedHold"
    ) {
      return;
    }
    if (r.navigationState === "dockedHold") return;
    if (!r.manualDockPending) return;
    if (performance.now() < r.postDockCommitLockUntilMs) return;
    updateDepartureTracking();
    clearManualCommitHoldoffIfRetreated();

    const threshold = manualTravel.commitThresholdRatio;
    if (Math.abs(r.departureRatio) >= threshold && !r.manualCommitHoldoff) {
      const direction = (r.departureRatio > 0 ? 1 : -1) as -1 | 1;
      const target = assistedDockTargetFromCommitment(
        r.travelDepth,
        r.lastDockedAnchorIndex,
        direction,
        scenes,
        sceneGap,
        loopLength
      );
      startAssistedDock(target, "commit");
      return;
    }

    const target = returnToLastDockTarget(
      r.travelDepth,
      r.lastDockedAnchorIndex,
      sceneGap,
      loopLength
    );
    startAssistedDock(target, "return");
  }, [
    manualTravel.commitThresholdRatio,
    scenes,
    sceneGap,
    loopLength,
    startAssistedDock,
    updateDepartureTracking,
    clearManualCommitHoldoffIfRetreated,
  ]);

  const scheduleManualIdle = useCallback(() => {
    clearManualIdleTimer();
    refs.current.manualIdleTimer = setTimeout(
      handleManualIdle,
      config.motion.snap.idleDelaySeconds * 1000
    );
  }, [
    clearManualIdleTimer,
    handleManualIdle,
    config.motion.snap.idleDelaySeconds,
  ]);

  const releaseDockedHoldToManual = useCallback(
    (bufferedVirtualPx: number) => {
      const r = refs.current;
      const bufferSign = departureBufferDirection(bufferedVirtualPx);
      r.departureIntentDetected = false;
      r.dockedHoldGatesOpen = false;
      r.departureBufferPx = 0;
      r.residualInputFiltered = false;
      clearManualIdleTimer();

      const bufferThresholdPx = effectiveDepartureBufferThresholdPx(
        r.reducedMotion,
        landingHold
      );
      let seededRatio = r.departureRatio;
      if (bufferSign !== 0) {
        r.departureDirection = bufferSign;
        seededRatio = departureRatioSeedFromBuffer(
          bufferedVirtualPx,
          bufferThresholdPx,
          manualTravel.commitThresholdRatio
        );
        r.departureRatio = seededRatio;
      }

      const willCommitImmediately =
        Math.abs(seededRatio) >= manualTravel.commitThresholdRatio;

      publishManualDockPending(true);
      publishNavigationState("manual");

      /**
       * Buffer release that already satisfies commit threshold: start assisted
       * dock on the next frame without a pre-impulse scrollTo, which would
       * cancel Lenis programmatic onComplete and strand manual travel mid-rail.
       */
      if (willCommitImmediately && bufferSign !== 0) {
        const target = assistedDockTargetFromCommitment(
          r.travelDepth,
          r.lastDockedAnchorIndex,
          bufferSign,
          scenes,
          sceneGap,
          loopLength
        );
        r.departureDirection = bufferSign;
        r.departureRatio =
          bufferSign * manualTravel.commitThresholdRatio;
        publishManualDockPending(true);
        publishNavigationState("manual");
        startAssistedDock(target, "commit");
        return;
      }

      if (lenis && bufferedVirtualPx !== 0) {
        const impulseVirtual = departureReleaseImpulseVirtualPx(
          bufferedVirtualPx,
          landingHold.departureReleaseImpulseRatio
        );
        const impulsePx = impulseVirtual * manualTravel.inputGain;
        const nextPx = lenis.targetScroll + impulsePx;
        lenis.scrollTo(nextPx, { programmatic: false });
        r.targetScrollPx = nextPx;
      }
      tryCommitAssistedDock(true);
      scheduleManualIdle();
    },
    [
      lenis,
      landingHold,
      manualTravel.commitThresholdRatio,
      manualTravel.inputGain,
      clearManualIdleTimer,
      scenes,
      sceneGap,
      loopLength,
      startAssistedDock,
      tryCommitAssistedDock,
      publishManualDockPending,
      publishNavigationState,
      scheduleManualIdle,
    ]
  );

  const handleDockedHoldInput = useCallback(
    (deltaY: number) => {
      const r = refs.current;
      if (r.navigationState !== "dockedHold") return;
      const now = performance.now();
      r.lastWheelInputMs = now;
      pinToDockedHoldScroll(r.dockedHoldPinScrollPx);

      const minHoldSeconds = effectiveMinimumHoldSeconds(
        r.reducedMotion,
        landingHold
      );
      if (
        !isMinimumHoldSatisfied(r.dockedHoldStartMs, now, minHoldSeconds)
      ) {
        r.residualInputFiltered = deltaY !== 0;
        return;
      }

      if (!r.dockedHoldGatesOpen) {
        r.dockedHoldGatesOpen = true;
      }

      if (now < r.departureBufferLockUntilMs) {
        r.residualInputFiltered = deltaY !== 0;
        return;
      }

      if (
        isResidualScrollInput(deltaY, landingHold.departureIntentThreshold)
      ) {
        r.residualInputFiltered = true;
        return;
      }

      r.residualInputFiltered = false;

      if (!landingHold.departureBufferEnabled) {
        r.departureIntentDetected = true;
        releaseDockedHoldToManual(deltaY);
        return;
      }

      r.departureIntentDetected = true;
      r.departureBufferPx = accumulateDepartureBufferPx(
        r.departureBufferPx,
        deltaY,
        landingHold.departureIntentThreshold
      );

      const thresholdPx = effectiveDepartureBufferThresholdPx(
        r.reducedMotion,
        landingHold
      );
      if (!isDepartureBufferReleaseReady(r.departureBufferPx, thresholdPx)) {
        return;
      }

      const buffered = r.departureBufferPx;
      releaseDockedHoldToManual(buffered);
    },
    [landingHold, pinToDockedHoldScroll, releaseDockedHoldToManual]
  );

  // ----- programmatic travel cancellation (only docking is cancellable) -----
  const cancelAssistedDock = useCallback(() => {
    if (!lenis) return;
    const r = refs.current;
    if (r.navigationState !== "snapping") return;
    const currentRenderScrollPx = lenis.animatedScroll;
    lenis.scrollTo(
      currentRenderScrollPx,
      immediateScrollOptions({ kind: "cancel-assisted-dock" })
    );
    r.renderScrollPx = currentRenderScrollPx;
    r.targetScrollPx = currentRenderScrollPx;
    r.committedDockTargetIndex = null;
      r.assistedDockTargetAnchorIndex = null;
      r.assistedDockTargetPx = null;
      r.assistedDockSnapStartMs = 0;
      r.manualCommitHoldoff = true;
    updateDepartureTracking();
    publishManualDockPending(true);
    publishNavigationState("manual");
  }, [lenis, publishManualDockPending, publishNavigationState, updateDepartureTracking]);

  // ----- rail-travel primitive used by menu, step, home, end -----
  const travelToLogicalDepth = useCallback(
    (logicalTarget: number, mode: "menu" | "keyboard") => {
      if (!lenis) return;
      const r = refs.current;
      if (r.navigationState === "menu" || r.navigationState === "keyboard") {
        return; // no cancellation, no queuing in v1
      }
      // ensureSafeCycle first; programmatic travel begins from center cycle
      const rebased = rebaseToCentralCycleIfNeeded();
      const targetPx = depthToRenderScrollPx(
        logicalTarget,
        rebased.rebaseOffsetDepth,
        pxPerDepthUnit
      );
      const deltaDepth = logicalTarget - rebased.travelDepth;
      const sceneSteps = Math.abs(deltaDepth) / sceneGap;

      let durationSeconds = clamp(
        config.motion.menuTravel.baseDurationSeconds +
          sceneSteps * config.motion.menuTravel.perSceneDurationSeconds,
        config.motion.menuTravel.baseDurationSeconds,
        config.motion.menuTravel.maxDurationSeconds
      );
      let easing =
        mode === "menu"
          ? config.motion.menuTravel.easing
          : config.motion.keyboard.easing;
      if (mode === "keyboard") {
        durationSeconds = config.motion.keyboard.durationSeconds;
      }
      if (r.reducedMotion) {
        durationSeconds = config.motion.reducedMotion.transitionSeconds;
        easing = linear;
      }

      clearManualIdleTimer();
      publishManualDockPending(false);
      const rAtStart = refs.current;
      rAtStart.departureRatio = 0;
      rAtStart.departureDirection = 0;
      rAtStart.committedDockTargetIndex = null;
      publishNavigationState(mode);

      lenis.scrollTo(
        targetPx,
        programmaticScrollOptions({
          durationSeconds,
          easing,
          lock: true,
          force: true,
          onComplete: () => {
            const rDone = refs.current;
            if (rDone.navigationState === "snapping") {
              return;
            }
            enterDockedHold(
              rDone.programmaticArrivalAnchorIndex,
              mode === "menu" ? "menuTravel" : "keyboardTravel"
            );
          },
          userData: { kind: `travel:${mode}`, targetPx, logicalTarget },
        })
      );
    },
    [
      lenis,
      rebaseToCentralCycleIfNeeded,
      pxPerDepthUnit,
      sceneGap,
      config.motion.menuTravel.baseDurationSeconds,
      config.motion.menuTravel.perSceneDurationSeconds,
      config.motion.menuTravel.maxDurationSeconds,
      config.motion.menuTravel.easing,
      config.motion.keyboard.durationSeconds,
      config.motion.keyboard.easing,
      config.motion.reducedMotion.transitionSeconds,
      clearManualIdleTimer,
      enterDockedHold,
      publishManualDockPending,
      publishNavigationState,
    ]
  );

  // ----- actions exposed via context -----
  const travelTo = useCallback(
    (anchorIndex: number) => {
      const base = scenes[anchorIndex].anchorIndex * sceneGap;
      const r = refs.current;
      r.programmaticArrivalAnchorIndex = anchorIndex;
      const target = closestEquivalentAnchor(r.travelDepth, base, loopLength);
      travelToLogicalDepth(target, "menu");
    },
    [scenes, sceneGap, loopLength, travelToLogicalDepth]
  );

  const stepBy = useCallback(
    (direction: -1 | 1) => {
      const r = refs.current;
      // Find the encounter anchor that is one scene-gap step in `direction`
      // from the current focused anchor, using closestEquivalentAnchor so the
      // step is along the shortest circular route.
      const focused = r.focusedAnchorIndex;
      const nextIndex = (focused + direction + scenes.length) % scenes.length;
      r.programmaticArrivalAnchorIndex = nextIndex;
      // Use the camera's current depth + sceneGap step to pick the *nearest*
      // equivalent of the target anchor — this matters near loop wraps.
      const pivot = r.travelDepth + direction * sceneGap;
      const base = scenes[nextIndex].anchorIndex * sceneGap;
      const target = closestEquivalentAnchor(pivot, base, loopLength);
      travelToLogicalDepth(target, "keyboard");
    },
    [scenes, sceneGap, loopLength, travelToLogicalDepth]
  );

  const goHome = useCallback(() => {
    const r = refs.current;
    r.programmaticArrivalAnchorIndex = 0;
    const base = scenes[0].anchorIndex * sceneGap;
    const target = closestEquivalentAnchor(r.travelDepth, base, loopLength);
    travelToLogicalDepth(target, "keyboard");
  }, [scenes, sceneGap, loopLength, travelToLogicalDepth]);

  const goEnd = useCallback(() => {
    const r = refs.current;
    r.programmaticArrivalAnchorIndex = scenes.length - 1;
    const base = scenes[scenes.length - 1].anchorIndex * sceneGap;
    const target = closestEquivalentAnchor(r.travelDepth, base, loopLength);
    travelToLogicalDepth(target, "keyboard");
  }, [scenes, sceneGap, loopLength, travelToLogicalDepth]);

  const actions: ControllerActions = useMemo(
    () => ({
      travelTo,
      stepBy,
      goHome,
      goEnd,
      ensureSafeCycle,
      cancelProgrammaticTravel: cancelAssistedDock,
    }),
    [
      travelTo,
      stepBy,
      goHome,
      goEnd,
      ensureSafeCycle,
      cancelAssistedDock,
    ]
  );

  // ----- initialization: position Lenis on the central cycle before reveal -----
  //
  // We perform a one-shot rebase + initial setState inside useLayoutEffect
  // so the scene surfaces reveal only after the camera is positioned. The
  // setState-inside-effect lint rule is intentionally suppressed for this
  // line: `initialized` is the bridge between Lenis becoming available
  // (external lifecycle) and React rendering the scene tree. Restructuring
  // as useSyncExternalStore would require pulling Lenis mount/lifecycle
  // out of ReactLenis, which the contract requires us to use as-is.
  useLayoutEffect(() => {
    if (!lenis) return;
    if (initialized) return;
    lenis.scrollTo(initialScrollPx, immediateScrollOptions({ kind: "init" }));
    const r = refs.current;
    r.renderScrollPx = initialScrollPx;
    r.targetScrollPx = initialScrollPx;
    r.rebaseOffsetDepth = -initialPhysicalCycle * loopLength;
    r.travelDepth = 0;
    r.wrappedDepth = 0;
    r.physicalCycle = initialPhysicalCycle;
    r.focusedAnchorIndex = 0;
    r.nearestAnchorIndex = 0;
    r.lastDockedAnchorIndex = 0;
    r.departureRatio = 0;
    r.departureDirection = 0;
    r.committedDockTargetIndex = null;
    r.direction = 0;
    r.velocity = 0;
    r.lastTickMs = performance.now();
    r.initialized = true;
    travelDepth.set(0);
    enterDockedHoldRef.current(0, "assistedDock");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialized(true);
  }, [
    lenis,
    initialized,
    initialScrollPx,
    initialPhysicalCycle,
    loopLength,
    travelDepth,
  ]);

  // ----- per-tick subscription to Lenis animatedScroll -----
  useLenis(
    (lenisInstance) => {
      if (!initialized) return;
      const r = refs.current;
      const renderScrollPx = lenisInstance.animatedScroll;
      const targetScrollPx = lenisInstance.targetScroll;
      const previousTravelDepth = r.travelDepth;
      const newTravelDepth =
        renderScrollPx / pxPerDepthUnit + r.rebaseOffsetDepth;
      const newWrappedDepth = wrap(newTravelDepth, loopLength);
      const newPhysicalCycle = Math.floor(renderScrollPx / loopLengthPxValue);

      const now = performance.now();
      const dt = (now - r.lastTickMs) / 1000;
      r.lastTickMs = now;
      if (dt > 0) {
        const instantVelocity = (newTravelDepth - previousTravelDepth) / dt;
        r.velocity = r.velocity * 0.7 + instantVelocity * 0.3;
        if (instantVelocity > 0) r.direction = 1;
        else if (instantVelocity < 0) r.direction = -1;
      }

      r.renderScrollPx = renderScrollPx;
      r.targetScrollPx = targetScrollPx;
      r.travelDepth = newTravelDepth;
      r.wrappedDepth = newWrappedDepth;
      r.physicalCycle = newPhysicalCycle;
      r.loopCycle = Math.floor(newTravelDepth / loopLength);

      travelDepth.set(newTravelDepth);

      if (
        r.navigationState === "snapping" &&
        r.assistedDockTargetPx !== null &&
        r.assistedDockTargetAnchorIndex !== null
      ) {
        const pxErr = Math.abs(renderScrollPx - r.assistedDockTargetPx);
        const targetErr = Math.abs(targetScrollPx - r.assistedDockTargetPx);
        const settled =
          pxErr < 2.5 &&
          targetErr < 2.5 &&
          Math.abs(r.velocity) < 0.35;
        let durationSeconds = manualTravel.assistedDockDurationSeconds;
        if (r.reducedMotion) {
          durationSeconds = config.motion.reducedMotion.transitionSeconds;
        }
        const durationElapsed =
          r.assistedDockSnapStartMs > 0 &&
          now - r.assistedDockSnapStartMs >= durationSeconds * 1000 + 32;
        if (settled || durationElapsed) {
          if (durationElapsed && lenis && r.assistedDockTargetAnchorIndex !== null) {
            const pinPx = pinScrollPxForAnchor(
              r.assistedDockTargetAnchorIndex,
              "central"
            );
            lenis.scrollTo(
              pinPx,
              immediateScrollOptions({ kind: "assisted-dock-duration-complete" })
            );
            r.renderScrollPx = pinPx;
            r.targetScrollPx = pinPx;
            r.travelDepth =
              pinPx / pxPerDepthUnit + r.rebaseOffsetDepth;
            r.wrappedDepth = wrap(r.travelDepth, loopLength);
            travelDepth.set(r.travelDepth);
          }
          if (r.assistedDockTargetAnchorIndex !== null) {
            finishAssistedDock(r.assistedDockTargetAnchorIndex);
          }
        }
      }

      if (r.navigationState === "dockedHold") {
        pinToDockedHoldScroll(r.dockedHoldPinScrollPx);
        const minHoldSeconds = effectiveMinimumHoldSeconds(
          r.reducedMotion,
          landingHold
        );
        if (isMinimumHoldSatisfied(r.dockedHoldStartMs, now, minHoldSeconds)) {
          r.dockedHoldGatesOpen = true;
        }
        if (landingHold.departureBufferEnabled && dt > 0) {
          r.departureBufferPx = decayDepartureBufferPx(
            r.departureBufferPx,
            r.lastWheelInputMs,
            now,
            effectiveInputQuietWindowSeconds(r.reducedMotion, landingHold),
            landingHold.departureBufferDecaySeconds,
            dt
          );
        }
        r.velocity = 0;
        updateDerivedFromTravelDepth(r.travelDepth, true);
        return;
      }

      updateDerivedFromTravelDepth(newTravelDepth, true);

      if (r.navigationState === "manual") {
        updateDepartureTracking();
        tryCommitAssistedDock();
      }

      // Continuous rebase guard — only outside programmatic travel.
      if (
        r.navigationState !== "menu" &&
        r.navigationState !== "keyboard" &&
        r.navigationState !== "snapping"
      ) {
        if (
          newPhysicalCycle < safeCycleMin ||
          newPhysicalCycle > safeCycleMax
        ) {
          rebaseToCentralCycleIfNeeded();
        }
      }
    },
    [
      initialized,
      pxPerDepthUnit,
      loopLength,
      loopLengthPxValue,
      safeCycleMin,
      safeCycleMax,
      travelDepth,
      updateDerivedFromTravelDepth,
      rebaseToCentralCycleIfNeeded,
      updateDepartureTracking,
      tryCommitAssistedDock,
      pinToDockedHoldScroll,
      finishAssistedDock,
      lenis,
      pinScrollPxForAnchor,
      manualTravel.assistedDockDurationSeconds,
      config.motion.reducedMotion.transitionSeconds,
      landingHold,
    ]
  );

  // ----- virtual-scroll: genuine user input detection -----
  useEffect(() => {
    if (!lenis) return;
    const onVirtualScroll = ({
      deltaX,
      deltaY,
    }: {
      deltaX: number;
      deltaY: number;
    }) => {
      // Lenis emits virtual-scroll even for clicks with zero delta; ignore those.
      if (deltaX === 0 && deltaY === 0) return;
      const r = refs.current;
      // Menu / keyboard travel: input is locked at Lenis (see scrollTo with
      // lock:true) and would not affect scroll; do not flip mode either.
      if (r.navigationState === "menu" || r.navigationState === "keyboard") {
        return;
      }
      if (r.navigationState === "dockedHold") {
        handleDockedHoldInput(deltaY);
        return;
      }
      if (r.navigationState === "snapping") {
        if (manualTravel.allowOppositeInputCancellation) {
          const opposite =
            r.departureDirection !== 0 &&
            deltaY * r.departureDirection < 0;
          if (opposite) {
            clearManualIdleTimer();
            cancelAssistedDock();
            publishManualDockPending(true);
            publishNavigationState("manual");
          }
        }
        return;
      }
      refs.current.suppressAutoCommit = false;
      publishManualDockPending(true);
      publishNavigationState("manual");
      scheduleManualIdle();
    };
    lenis.on("virtual-scroll", onVirtualScroll);
    return () => {
      lenis.off("virtual-scroll", onVirtualScroll);
    };
  }, [
    lenis,
    cancelAssistedDock,
    clearManualIdleTimer,
    manualTravel.allowOppositeInputCancellation,
    publishManualDockPending,
    publishNavigationState,
    scheduleManualIdle,
    handleDockedHoldInput,
  ]);

  useEffect(() => () => clearManualIdleTimer(), [clearManualIdleTimer]);

  /**
   * Native wheel during assisted docking (docked hold uses virtual-scroll only).
   *
   * This handler reads the RAW browser `event.deltaY` (Lenis's `wheelMultiplier`
   * is not applied here), so we must normalize the sign through `forwardScrollSign`
   * to match the post-multiplier convention used everywhere else in the controller.
   * Forward-normalized delta = forwardScrollSign × event.deltaY.
   */
  useEffect(() => {
    if (!lenis) return;
    const forwardSign = manualTravel.forwardScrollSign;
    const onWheel = (event: WheelEvent) => {
      const r = refs.current;
      if (r.navigationState !== "snapping") return;
      if (!manualTravel.allowOppositeInputCancellation) return;
      if (r.departureDirection === 0) return;
      const forwardDelta = forwardSign * event.deltaY;
      if (forwardDelta * r.departureDirection >= 0) return;
      clearManualIdleTimer();
      cancelAssistedDock();
      publishManualDockPending(true);
      publishNavigationState("manual");
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [
    lenis,
    manualTravel.allowOppositeInputCancellation,
    manualTravel.forwardScrollSign,
    clearManualIdleTimer,
    cancelAssistedDock,
    publishManualDockPending,
    publishNavigationState,
  ]);

  // ----- test bridge ------------------------------------------------------
  // Exposed only for the Playwright diagnostic suite so tests can drive the
  // rail deterministically (without simulating dozens of wheel events) and
  // read the controller's internal refs without scraping the overlay. Not
  // intended as a public API; safe to leave in production because the
  // bridge only exposes existing instance methods and read-only state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!lenis) return;
    const bridge = {
      actions,
      state: () => {
        const r = refs.current;
        const now = performance.now();
        const minHold = effectiveMinimumHoldSeconds(r.reducedMotion, landingHold);
        const bufferThreshold = effectiveDepartureBufferThresholdPx(
          r.reducedMotion,
          landingHold
        );
        return {
          ...r,
          holdRemainingSeconds:
            r.navigationState === "dockedHold"
              ? holdRemainingSeconds(r.dockedHoldStartMs, now, minHold)
              : 0,
          departureBufferThresholdPx: bufferThreshold,
          departureBufferDirection: departureBufferDirection(
            r.departureBufferPx
          ),
          departureBufferThresholdReached: isDepartureBufferReleaseReady(
            r.departureBufferPx,
            bufferThreshold
          ),
        };
      },
      travelDepth: () => travelDepth.get(),
      jumpToRenderScrollPx: (px: number) => {
        const r = refs.current;
        if (r.navigationState === "dockedHold") {
          publishNavigationState("manual");
          publishManualDockPending(false);
          r.dockedHoldGatesOpen = false;
          r.departureIntentDetected = false;
          r.departureBufferPx = 0;
          r.residualInputFiltered = false;
        }
        r.suppressAutoCommit = true;
        clearManualIdleTimer();
        lenis.scrollTo(px, immediateScrollOptions({ kind: "test-jump" }));
        r.renderScrollPx = px;
        r.targetScrollPx = px;
        r.travelDepth = px / pxPerDepthUnit + r.rebaseOffsetDepth;
        r.wrappedDepth = wrap(r.travelDepth, loopLength);
        travelDepth.set(r.travelDepth);
        let bestAbs = Infinity;
        let focus = 0;
        for (let i = 0; i < scenes.length; i++) {
          const base = scenes[i].anchorIndex * sceneGap;
          const eq = closestEquivalentAnchor(r.travelDepth, base, loopLength);
          const absRel = Math.abs(eq - r.travelDepth);
          if (absRel < bestAbs) {
            bestAbs = absRel;
            focus = i;
          }
        }
        r.focusedAnchorIndex = focus;
        if (bestAbs < focusEpsilon) {
          r.lastDockedAnchorIndex = focus;
          r.departureRatio = 0;
          r.departureDirection = 0;
        }
      },
      lenis,
    };
    (window as unknown as { __rail?: typeof bridge }).__rail = bridge;
    return () => {
      delete (window as unknown as { __rail?: typeof bridge }).__rail;
    };
  }, [
    actions,
    lenis,
    travelDepth,
    loopLength,
    pxPerDepthUnit,
    publishNavigationState,
    publishManualDockPending,
    clearManualIdleTimer,
    scenes,
    sceneGap,
    focusEpsilon,
    landingHold,
  ]);

  // ----- ctx value -----
  const value: SpatialControllerContextValue = useMemo(
    () => ({
      config,
      loopLength,
      loopLengthPx: loopLengthPxValue,
      totalHeightPx,
      state: {
        initialized,
        focusedAnchorIndex,
        navigationState,
        manualDockPending,
        reducedMotion,
      },
      actions,
      travelDepth,
      diagnostic,
    }),
    [
      config,
      loopLength,
      loopLengthPxValue,
      totalHeightPx,
      initialized,
      focusedAnchorIndex,
      navigationState,
      manualDockPending,
      reducedMotion,
      actions,
      travelDepth,
      diagnostic,
    ]
  );

  return (
    <SpatialControllerContext.Provider value={value}>
      {children}
    </SpatialControllerContext.Provider>
  );
};

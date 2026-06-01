/**
 * Spatial template types.
 *
 * Rail-camera conceptual model:
 *   The viewport is a fixed camera mounted on a continuous looped rail. The
 *   user's scroll input drives the camera's logical position along that rail
 *   (`travelDepth`, narrated as `cameraTravelDepth`). Each scene frame is a
 *   fixed encounter anchor in world space. Visual transforms describe each
 *   anchor's distance from the moving camera, not stacking depth of a card.
 *
 * Implementation identifiers (SceneFrame, SceneLayer, travelDepth, …) are
 * kept for engineering simplicity. Human-readable surfaces (diagnostic
 * labels, READMEs, doc comments) speak the rail-camera language.
 */

import type { ReactNode } from "react";

export type DisplayMode = "diagnostic" | "skeleton" | "production";

/**
 * Camera navigation mode (controller state machine).
 *
 *   idle       — parked at an encounter; no animation in flight (legacy settle).
 *   dockedHold — post-arrival landing hold; anchor pinned, momentum absorbed.
 *   manual     — free camera; user-driven via wheel/touch.
 *   snapping   — assisted directional docking (or return-to-dock arrival).
 *   menu       — accelerated rail travel triggered by encounter index button.
 *   keyboard   — accelerated rail travel triggered by keyboard.
 */
export type NavigationState =
  | "idle"
  | "dockedHold"
  | "manual"
  | "snapping"
  | "menu"
  | "keyboard";

/**
 * Snap behavior. Only "nearest" is implemented in this prototype.
 * "directional" is reserved for future momentum-aware docking.
 */
export type SnapMode = "nearest" | "directional";

/**
 * Programmatic-travel mode label. Used by cancelProgrammaticTravel; in this
 * prototype only "snapping" is cancellable.
 */
export type ProgrammaticMode = "snapping" | "menu" | "keyboard";

/**
 * Anonymous encounter anchor on the looped rail.
 *
 * `anchorIndex` × `sceneGap` (from MotionTokens) = baseAnchorDepth, the
 * anchor's base position along the rail in depth units. The actual nearest
 * equivalent of that anchor depends on the camera's current travel depth.
 */
export interface SceneManifestEntry {
  /** Stable, anonymous id (e.g. "scene-01"). No content meaning. */
  id: string;
  /** Visible label in encounter index navigation (e.g. "01"). */
  navLabel: string;
  /** 0..n-1; multiplied by sceneGap to derive baseAnchorDepth. */
  anchorIndex: number;
  /** Human-readable tag for the rail telemetry overlay only. */
  diagnosticLabel: string;
}

/**
 * All spacing, atmospheric falloff curves, parallax depths, docking
 * timings and rail-travel timings live here so behavior can be tuned
 * without touching motion/controller code.
 *
 * Durations are SECONDS (matches Lenis scrollTo API).
 */
export interface MotionTokens {
  /** Depth units per encounter anchor along the rail. */
  sceneGap: number;
  /** Physical scroll pixels per logical depth unit. */
  pxPerDepthUnit: number;
  /** Focal-plane depth offset; must be 0 in this prototype (invariant I-3 pair). */
  focalPlane: number;
  /** |relativeDepth| at which an anchor is fully attenuated. */
  windowRadius: number;
  /** |relativeDepth| below which the encounter accepts pointer input. */
  focusEpsilon: number;
  /** CSS perspective applied to the encounter field. */
  perspective: number;

  /** Multi-cycle physical rail surface with central safe band. */
  physical: {
    /** Number of physical loop copies stitched together. */
    physicalLoopCopies: number;
    /** Zero-indexed center cycle the camera starts on. */
    initialPhysicalCycle: number;
    /** Cycles on each side of center that are still safe (no rebase needed). */
    safeBandHalfWidth: number;
  };

  /** Atmospheric and parallax falloff curves keyed by |rel| / windowRadius ∈ [0,1]. */
  scaleAt: { focus: number; far: number };
  opacityAt: { focus: number; far: number };
  blurPxAt: { focus: number; far: number };
  /** Focus value must be 0 (invariant I-3); signed by sign(rel) for parallax. */
  translateZAt: { focus: number; far: number };

  /** Docking after manual rail movement ends. */
  snap: {
    /** Implemented mode. Reserved values: "directional". */
    mode: SnapMode;
    /** Reserved for future momentum-aware docking; ignored when mode === "nearest". */
    directionalBiasEnabled: boolean;
    /** Reserved threshold for directional bias. */
    velocityThreshold: number;
    /** Settle window after manual input ends before docking initiates. */
    idleDelaySeconds: number;
    /** Lenis scrollTo duration for docking (seconds). */
    durationSeconds: number;
    /** Lenis scrollTo easing for docking. */
    easing: (t: number) => number;
  };

  /** Encounter-index rail travel (clicking 01..06). */
  menuTravel: {
    /** Baseline travel duration for an adjacent encounter (seconds). */
    baseDurationSeconds: number;
    /** Added per scene-step traveled (seconds). */
    perSceneDurationSeconds: number;
    /** Hard upper bound (seconds). */
    maxDurationSeconds: number;
    /** Accelerate-then-decelerate easing function. */
    easing: (t: number) => number;
  };

  /** Keyboard rail travel (Arrow/Home/End). */
  keyboard: {
    durationSeconds: number;
    easing: (t: number) => number;
  };

  /** Reduced-motion overrides. */
  reducedMotion: {
    /** Discrete focus-transition duration (seconds). */
    transitionSeconds: number;
    /** Pin scale to focus values (always true in v1). */
    disableContinuousScale: true;
    /** Pin blur to focus values (always true in v1). */
    disableContinuousBlur: true;
  };

  /**
   * Manual wheel/touch travel: exploratory departure, directional commitment,
   * and assisted ease-out arrival. Does not affect menu or keyboard travel.
   */
  manualTravel: {
    /** Multiplier on Lenis wheel input (before: implicit 1.0). */
    inputGain: number;
    /**
     * Direction of forward camera travel along the rail relative to wheel input.
     *  +1  → scrolling DOWN (positive deltaY) advances forward (document convention).
     *  −1  → scrolling UP   (negative deltaY) advances forward (rail-camera convention).
     *
     * Applied as a signed multiplier on Lenis wheelMultiplier/touchMultiplier so
     * the entire post-multiplier pipeline (virtual-scroll handler, departure buffer,
     * release impulse, opposite-cancellation in onVirtualScroll) is sign-neutral.
     * Native wheel cancellation must apply the same sign to the raw browser event.
     */
    forwardScrollSign: 1 | -1;
    /**
     * |signed departure ratio| at which the adjacent encounter in the travel
     * direction is committed (ratio = (travelDepth − dockEq) / sceneGap).
     */
    commitThresholdRatio: number;
    /**
     * Duration for assisted arrival into committed or return-to-dock targets.
     * 0.72s: long enough to read as camera braking (~2× prior corrective snap)
     * without approaching menu-hop pacing.
     */
    assistedDockDurationSeconds: number;
    /** Strong ease-out for assisted arrivals. */
    assistedDockEasing: (t: number) => number;
    /** Opposite wheel/touch during assisted docking returns to free camera. */
    allowOppositeInputCancellation: boolean;
  };

  /**
   * Brief rooted hold after intentional arrival, then resisted departure
   * via accumulated deliberate scroll before manual travel resumes.
   */
  landingHold: {
    enabled: boolean;
    minimumHoldSeconds: number;
    inputQuietWindowSeconds: number;
    /** Lenis virtual-scroll deltaY magnitude (px/event). */
    departureIntentThreshold: number;
    applyAfterAssistedDocking: boolean;
    applyAfterMenuTravel: boolean;
    applyAfterKeyboardTravel: boolean;
    minimumHoldSecondsReducedMotion: number;
    inputQuietWindowSecondsReducedMotion: number;
    departureBufferEnabled: boolean;
    departureBufferThresholdPx: number;
    departureBufferDecaySeconds: number;
    departureReleaseImpulseRatio: number;
    departureBufferThresholdPxReducedMotion: number;
  };
}

/**
 * Per-frame context handed to the injected scene content renderer.
 * Lets future skeleton/production modes read the same logical and
 * computed-visual values that the diagnostic placeholder reads.
 */
export interface SceneRenderContext {
  scene: SceneManifestEntry;
  /** anchorIndex * sceneGap. */
  baseAnchorDepth: number;
  /** closestEquivalentAnchor(travelDepth, baseAnchorDepth, loopLength). */
  equivalentAnchorDepth: number;
  /** equivalentAnchorDepth − travelDepth. Signed; in (−L/2, L/2]. */
  relativeDepth: number;
  /** True iff this is the encounter anchor nearest the camera. */
  focused: boolean;
  /** Computed visual mapping at the current frame. */
  computed: {
    opacity: number;
    scale: number;
    blurPx: number;
    translateZ: number;
    pointerEvents: "auto" | "none";
  };
}

/**
 * The configuration object SpatialViewport accepts. Future page types pass
 * a different `renderSceneContent` (and eventually a different `displayMode`)
 * without touching motion or navigation code.
 */
export interface SpatialConfig {
  scenes: SceneManifestEntry[];
  motion: MotionTokens;
  displayMode: DisplayMode;
  /** Slot for injected encounter content. Diagnostic build renders ScenePlaceholder. */
  renderSceneContent: (ctx: SceneRenderContext) => ReactNode;
  showDiagnostics: boolean;
  showStandardViewToggle: boolean;
}

/**
 * Result of an atomic central-cycle rebase. Returned synchronously so
 * programmatic travel can compute its target using post-rebase coordinates
 * instead of waiting for a later Lenis tick.
 */
export interface RebaseResult {
  renderScrollPx: number;
  rebaseOffsetDepth: number;
  travelDepth: number;
}

/**
 * Controller state exposed via context. Updated continuously from Lenis ticks.
 *
 * Field meanings (rail-camera narrative):
 *   renderScrollPx      → camera render coordinate (Lenis animatedScroll)
 *   targetScrollPx      → camera target coordinate (Lenis targetScroll)
 *   rebaseOffsetDepth   → rail rebase offset (silent recentering)
 *   travelDepth         → camera travel depth (continuous, unwrapped)
 *   wrappedDepth        → camera position within current loop
 *   focusedAnchorIndex  → current encounter anchor
 *   nearestAnchorIndex  → nearest encounter anchor for snap targeting
 *   navigationState     → camera mode (idle/manual/docking/menu/keyboard)
 *   direction           → travel direction (-1/0/+1)
 *   velocity            → camera velocity (depth units per second, EMA)
 *   loopCycle           → signed full-loop revolutions since mount
 *   physicalCycle       → floor(renderScrollPx / loopLengthPx)
 *   reducedMotion       → matchMedia('prefers-reduced-motion: reduce')
 *   manualDockPending   → true after genuine wheel/touch input; cleared by docking
 *                         completion, menu, keyboard, or another manual input cycle
 *   initialized         → true after the central-cycle rebase + scene reveal
 */
export interface ControllerState {
  initialized: boolean;

  renderScrollPx: number;
  targetScrollPx: number;
  physicalCycle: number;

  rebaseOffsetDepth: number;
  travelDepth: number;
  wrappedDepth: number;
  loopCycle: number;

  focusedAnchorIndex: number;
  nearestAnchorIndex: number;
  direction: -1 | 0 | 1;
  velocity: number;

  navigationState: NavigationState;
  reducedMotion: boolean;
  manualDockPending: boolean;

  /** Scene index the camera last arrived at via docking or programmatic travel. */
  lastDockedAnchorIndex: number;
  /** Sign of departure from last dock: (travelDepth − dockEq) / sceneGap. */
  departureRatio: number;
  /** −1 backward, 0 exploratory, +1 forward along the rail. */
  departureDirection: -1 | 0 | 1;
  /** Adjacent target index after commitment, or null before commitment. */
  committedDockTargetIndex: number | null;

  dockedHoldStartMs: number;
  dockedHoldPinScrollPx: number;
  lastWheelInputMs: number;
  holdRemainingSeconds: number;
  inputQuiet: boolean;
  departureIntentDetected: boolean;
  departureBufferPx: number;
  departureBufferThresholdPx: number;
  departureBufferDirection: -1 | 0 | 1;
  departureBufferThresholdReached: boolean;
  residualInputFiltered: boolean;
}

/**
 * Controller actions exposed via context. All programmatic travel methods
 * call rebaseToCentralCycleIfNeeded() first and use its returned RebaseResult.
 */
export interface ControllerActions {
  /** Rail travel to a given encounter anchor (menu mode). */
  travelTo(anchorIndex: number): void;
  /** One-step keyboard rail travel. */
  stepBy(direction: -1 | 1): void;
  /** Keyboard Home: travel to encounter anchor 0 (Scene 01). */
  goHome(): void;
  /** Keyboard End: travel to encounter anchor N-1 (Scene 06). */
  goEnd(): void;
  /** Force the camera into the central safe rail band. Synchronous. */
  ensureSafeCycle(): RebaseResult;
  /** Abort an in-flight docking and return control to the manual user. */
  cancelProgrammaticTravel(mode: "snapping"): void;
}

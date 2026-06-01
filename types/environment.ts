/**
 * Environmental depth-cue layer types.
 *
 * The environment is a non-interactive DOM/CSS proof that the same camera
 * motion that drives encounter anchors can also drive a continuous looped
 * world (rails, gates, encounter thresholds). It consumes the existing
 * `travelDepth` MotionValue and `loopLength` from the spatial controller
 * read-only — it never owns scroll state.
 */

export interface EnvironmentTokens {
  /**
   * Sub-rhythm spacing between repeating structural gates, in depth units.
   * Must divide `loopLength` evenly so gates wrap continuously across the
   * circular route boundary (invariant I-E1).
   */
  gateSpacing: number;

  /**
   * |relativeDepth| beyond which a gate instance is culled. Must be strictly
   * less than loopLength/2 (invariant I-E2) so the opposite-side equivalent
   * cannot become simultaneously visible.
   */
  gateRenderWindowDepth: number;

  /**
   * Upper bound on simultaneously visible gates. With gateSpacing 200 and
   * gateRenderWindowDepth 1500 the natural maximum is 15; we use a slightly
   * larger budget so the cull boundary check is generous.
   */
  gateMaxVisibleInstances: number;

  /** Same primitive as `windowRadius` for SceneFrames; threshold render distance. */
  encounterThresholdRenderWindowDepth: number;

  /** Repeating depth-rail segment period (depth units). */
  railSegmentDepth: number;

  /** |relativeDepth| beyond which a rail segment is culled. */
  railRenderWindowDepth: number;

  /**
   * Atmospheric haze ramp (depth units). Fully clear < fogStart; fully fogged
   * ≥ fogEnd. fogEnd must be ≤ gateRenderWindowDepth − fadeMargin so the wrap
   * copy is invisible before it enters from the far side (invariant I-E3).
   */
  fogStartDepth: number;
  fogEndDepth: number;

  /** Lateral pixel offset of the two longitudinal rails from the route axis. */
  parallaxRailOffsetPx: number;

  /** Inner-edge half-width of structural gates (px). */
  gateLateralOffsetPx: number;

  /** Reduced-motion overrides. */
  reduced: {
    /** Multiplier applied to per-instance translateZ (0 = stationary). */
    parallaxTranslateRatio: number;
    /** Lower visible-instance ceiling when reduce mode is active. */
    gateMaxVisibleInstances: number;
  };
}

/**
 * One emitted environmental instance derived from camera depth.
 * Positions are signed offsets in depth units; consumers multiply by
 * `pxPerDepthUnit` to drive CSS translate.
 */
export interface EnvironmentInstance {
  /** Stable key across frames so React can identify the same world object. */
  key: string;
  /** Equivalent absolute depth (continuous, unwrapped). */
  equivalentDepth: number;
  /** Signed (equivalentDepth − travelDepth); in (−L/2, L/2]. */
  relativeDepth: number;
  /** Atmospheric attenuation in [0,1]; 1 = fully clear, 0 = fully fogged. */
  clarity: number;
}

export interface EnvironmentToggleState {
  enabled: boolean;
}

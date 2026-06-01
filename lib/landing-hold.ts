/**
 * Post-arrival docked hold: eligibility, release gates, departure buffer, and
 * input classification.
 *
 * `departureIntentThreshold` and `departureBufferThresholdPx` use the same
 * units as Lenis `virtual-scroll` `deltaY` / `deltaX` (raw wheel/touch deltas
 * per event, before the controller applies inputGain via Lenis wheelMultiplier).
 */

export type LandingHoldArrivalSource =
  | "assistedDock"
  | "menuTravel"
  | "keyboardTravel";

export interface LandingHoldTokens {
  enabled: boolean;
  minimumHoldSeconds: number;
  inputQuietWindowSeconds: number;
  /** Per virtual-scroll event; see module doc. */
  departureIntentThreshold: number;
  applyAfterAssistedDocking: boolean;
  applyAfterMenuTravel: boolean;
  applyAfterKeyboardTravel: boolean;
  /** Shorter hold when prefers-reduced-motion (still blocks momentum carry). */
  minimumHoldSecondsReducedMotion: number;
  inputQuietWindowSecondsReducedMotion: number;
  departureBufferEnabled: boolean;
  /** Accumulated deliberate virtual-scroll px required to leave docked hold. */
  departureBufferThresholdPx: number;
  /** Time constant for buffer decay after input goes quiet. */
  departureBufferDecaySeconds: number;
  /** Fraction of buffered virtual-scroll px applied as initial scroll impulse. */
  departureReleaseImpulseRatio: number;
  departureBufferThresholdPxReducedMotion: number;
}

export const shouldApplyLandingHold = (
  source: LandingHoldArrivalSource,
  tokens: Pick<
    LandingHoldTokens,
    | "enabled"
    | "applyAfterAssistedDocking"
    | "applyAfterMenuTravel"
    | "applyAfterKeyboardTravel"
  >
): boolean => {
  if (!tokens.enabled) return false;
  switch (source) {
    case "assistedDock":
      return tokens.applyAfterAssistedDocking;
    case "menuTravel":
      return tokens.applyAfterMenuTravel;
    case "keyboardTravel":
      return tokens.applyAfterKeyboardTravel;
    default:
      return false;
  }
};

export const effectiveMinimumHoldSeconds = (
  reducedMotion: boolean,
  tokens: Pick<
    LandingHoldTokens,
    "minimumHoldSeconds" | "minimumHoldSecondsReducedMotion"
  >
): number =>
  reducedMotion
    ? tokens.minimumHoldSecondsReducedMotion
    : tokens.minimumHoldSeconds;

export const effectiveInputQuietWindowSeconds = (
  reducedMotion: boolean,
  tokens: Pick<
    LandingHoldTokens,
    "inputQuietWindowSeconds" | "inputQuietWindowSecondsReducedMotion"
  >
): number =>
  reducedMotion
    ? tokens.inputQuietWindowSecondsReducedMotion
    : tokens.inputQuietWindowSeconds;

export const effectiveDepartureBufferThresholdPx = (
  reducedMotion: boolean,
  tokens: Pick<
    LandingHoldTokens,
    "departureBufferThresholdPx" | "departureBufferThresholdPxReducedMotion"
  >
): number =>
  reducedMotion
    ? tokens.departureBufferThresholdPxReducedMotion
    : tokens.departureBufferThresholdPx;

export const isDepartureIntent = (
  deltaY: number,
  threshold: number
): boolean => Math.abs(deltaY) >= threshold;

/** Residual momentum: wheel events below the departure threshold. */
export const isResidualScrollInput = (
  deltaY: number,
  threshold: number
): boolean =>
  deltaY !== 0 && Math.abs(deltaY) < threshold;

export const isInputQuiet = (
  lastInputMs: number,
  nowMs: number,
  quietWindowSeconds: number
): boolean => nowMs - lastInputMs >= quietWindowSeconds * 1000;

export const isMinimumHoldSatisfied = (
  holdStartMs: number,
  nowMs: number,
  minimumHoldSeconds: number
): boolean => nowMs - holdStartMs >= minimumHoldSeconds * 1000;

export const holdRemainingSeconds = (
  holdStartMs: number,
  nowMs: number,
  minimumHoldSeconds: number
): number =>
  Math.max(0, minimumHoldSeconds - (nowMs - holdStartMs) / 1000);

/** Legacy: hold elapsed + input quiet (used for buffer decay timing, not instant release). */
export const canReleaseDockedHold = (
  holdStartMs: number,
  lastInputMs: number,
  nowMs: number,
  reducedMotion: boolean,
  tokens: LandingHoldTokens
): boolean =>
  isMinimumHoldSatisfied(
    holdStartMs,
    nowMs,
    effectiveMinimumHoldSeconds(reducedMotion, tokens)
  ) &&
  isInputQuiet(
    lastInputMs,
    nowMs,
    effectiveInputQuietWindowSeconds(reducedMotion, tokens)
  );

/** Same-direction accumulation; opposite direction resets to the new delta. */
export const accumulateDepartureBufferPx = (
  bufferPx: number,
  deltaY: number,
  intentThreshold: number
): number => {
  if (!isDepartureIntent(deltaY, intentThreshold)) {
    return bufferPx;
  }
  const deltaSign = Math.sign(deltaY);
  const bufferSign = Math.sign(bufferPx);
  if (bufferSign !== 0 && deltaSign !== bufferSign) {
    return deltaY;
  }
  return bufferPx + deltaY;
};

export const isDepartureBufferReleaseReady = (
  bufferPx: number,
  thresholdPx: number
): boolean => Math.abs(bufferPx) >= thresholdPx;

/** Virtual-scroll px carried into manual travel after buffer release. */
export const departureReleaseImpulseVirtualPx = (
  bufferPx: number,
  impulseRatio: number
): number => bufferPx * impulseRatio;

/** Seeds manual commit ratio from accumulated buffer effort (virtual-scroll px). */
export const departureRatioSeedFromBuffer = (
  bufferedVirtualPx: number,
  bufferThresholdPx: number,
  commitThresholdRatio: number
): number => {
  const sign = departureBufferDirection(bufferedVirtualPx);
  const effortRatio = Math.abs(bufferedVirtualPx) / Math.max(bufferThresholdPx, 1);
  return sign * commitThresholdRatio * Math.max(1, effortRatio);
};

export const decayDepartureBufferPx = (
  bufferPx: number,
  lastInputMs: number,
  nowMs: number,
  quietWindowSeconds: number,
  decaySeconds: number,
  dtSeconds: number
): number => {
  if (bufferPx === 0 || decaySeconds <= 0) {
    return bufferPx;
  }
  if (!isInputQuiet(lastInputMs, nowMs, quietWindowSeconds)) {
    return bufferPx;
  }
  const decayAmount = (Math.abs(bufferPx) * dtSeconds) / decaySeconds;
  const next = Math.abs(bufferPx) - decayAmount;
  if (next <= 0) {
    return 0;
  }
  return Math.sign(bufferPx) * next;
};

export const departureBufferDirection = (
  bufferPx: number
): -1 | 0 | 1 =>
  bufferPx > 0 ? 1 : bufferPx < 0 ? -1 : 0;

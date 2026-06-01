/**
 * Content-passage types.
 *
 * The depth-passage model describes how content INSIDE an encounter behaves
 * relative to the camera's signed distance from that encounter's anchor:
 *
 *   rel = equivalentAnchorDepth − travelDepth      (continuous, signed)
 *
 *   - Forward camera motion shrinks `rel` from large positive (incoming) →
 *     0 (docked) → large negative (passed).
 *   - The passage curve is asymmetric: incoming and outgoing use different
 *     scale/opacity/blur ramps so the camera reads as travelling *through*
 *     the encounter rather than briefly stopping at a card.
 *
 * Token semantics live in `config/content-passage-tokens.ts`. Pure math
 * (phase classifier, mapping function) lives in `lib/content-passage.ts`.
 * The lab and live composition consume both via small adapter components.
 */

export type ContentPassagePhase = "incoming" | "docked" | "outgoing";

export interface ContentPassageMapping {
  /** Phase classifier output for diagnostic readouts. */
  phase: ContentPassagePhase;
  /** Continuous scale multiplier. Caps at 1.0 at dock; grows beyond 1 only on outgoing side. */
  scale: number;
  /** Continuous opacity in [0,1]. 1 only at docked. */
  opacity: number;
  /** CSS blur in px; 0 at docked. */
  blurPx: number;
  /** Optional secondary rotateY in degrees; 0 unless secondary effects enabled. */
  rotateYDeg: number;
  /** Optional secondary lateral offset in px; 0 unless secondary effects enabled. */
  lateralPx: number;
}

export interface ContentPassageIncomingTokens {
  scaleStart: number;
  scaleAtDock: number;
  opacityStart: number;
  opacityAtDock: number;
  blurStartPx: number;
  blurAtDockPx: number;
}

export interface ContentPassageDockedTokens {
  scale: number;
  opacity: number;
  blurPx: number;
}

export interface ContentPassageOutgoingTokens {
  scaleAtDock: number;
  scaleAtEnd: number;
  opacityAtEnd: number;
  blurAtEndPx: number;
}

export interface ContentPassageSecondaryTokens {
  rotateYAtIncomingStartDeg: number;
  rotateYAtDockDeg: number;
  rotateYAtOutgoingEndDeg: number;
  lateralOffsetAtIncomingStartPx: number;
  lateralOffsetAtOutgoingEndPx: number;
  headlineStaggerSeconds: number;
}

export interface ContentPassageTokens {
  /** Depth-unit width of the incoming approach band (positive `rel` side). */
  incomingApproachRangeDepth: number;
  /** |rel| inside this band → docked phase. Small (< sceneGap / 10). */
  dockedClarityZoneDepth: number;
  /** Depth-unit width of the outgoing/passage band (negative `rel` side). */
  outgoingPassageRangeDepth: number;
  incoming: ContentPassageIncomingTokens;
  docked: ContentPassageDockedTokens;
  outgoing: ContentPassageOutgoingTokens;
  secondary: ContentPassageSecondaryTokens;
  reduced: {
    incomingApproachRangeDepth: number;
    outgoingPassageRangeDepth: number;
    incoming: ContentPassageIncomingTokens;
    outgoing: ContentPassageOutgoingTokens;
    secondary: ContentPassageSecondaryTokens;
  };
}

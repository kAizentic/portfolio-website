/**
 * Content-passage tokens (Phase B first-pass values).
 *
 * Tuned in the Encounter Choreography Lab at `/lab/encounter`. Separate file
 * from `motion-tokens.ts` so existing controller tests remain unaffected.
 *
 * Sign convention:
 *   rel = equivalentAnchorDepth − travelDepth
 *   incoming phase  → rel > +dockedClarityZoneDepth
 *   docked phase    → |rel| ≤ +dockedClarityZoneDepth
 *   outgoing phase  → rel < −dockedClarityZoneDepth   (camera has passed through)
 *
 * Reduced motion collapses scale/blur/rotation/lateral to no-op and tightens
 * the bands so the opacity ramp finishes well within the encounter window.
 */

import type { ContentPassageTokens } from "@/types/content-passage";

export const contentPassageTokens: ContentPassageTokens = {
  incomingApproachRangeDepth: 1400,
  dockedClarityZoneDepth: 80,
  outgoingPassageRangeDepth: 1200,

  incoming: {
    scaleStart: 0.55,
    scaleAtDock: 1.0,
    opacityStart: 0,
    opacityAtDock: 1,
    blurStartPx: 14,
    blurAtDockPx: 0,
  },
  docked: { scale: 1.0, opacity: 1, blurPx: 0 },
  outgoing: {
    scaleAtDock: 1.0,
    /** Oversized after camera has fully passed through (depth-passage feel). */
    scaleAtEnd: 2.6,
    opacityAtEnd: 0,
    blurAtEndPx: 18,
  },
  secondary: {
    rotateYAtIncomingStartDeg: 8,
    rotateYAtDockDeg: 0,
    rotateYAtOutgoingEndDeg: -8,
    lateralOffsetAtIncomingStartPx: 24,
    lateralOffsetAtOutgoingEndPx: -36,
    headlineStaggerSeconds: 0.06,
  },

  reduced: {
    incomingApproachRangeDepth: 600,
    outgoingPassageRangeDepth: 600,
    incoming: {
      scaleStart: 1,
      scaleAtDock: 1,
      opacityStart: 0,
      opacityAtDock: 1,
      blurStartPx: 0,
      blurAtDockPx: 0,
    },
    outgoing: {
      scaleAtDock: 1,
      scaleAtEnd: 1,
      opacityAtEnd: 0,
      blurAtEndPx: 0,
    },
    secondary: {
      rotateYAtIncomingStartDeg: 0,
      rotateYAtDockDeg: 0,
      rotateYAtOutgoingEndDeg: 0,
      lateralOffsetAtIncomingStartPx: 0,
      lateralOffsetAtOutgoingEndPx: 0,
      headlineStaggerSeconds: 0,
    },
  },
};

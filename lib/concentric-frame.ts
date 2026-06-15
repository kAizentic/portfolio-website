/**
 * concentric-frame — pure geometry + convergence math for the light-theme
 * framing-ring background (see components/visual-effects/ConcentricFrameField).
 *
 * The background is a set of nested, concentric rounded-square rings sharing one
 * shape. As the camera (desktop rail) or the scroll position (mobile flow) hones
 * in on a section, the rings "roll in" — they rotate toward alignment and scale
 * down so the innermost ring settles as a square border framing the section's
 * content ("framed"). Between sections they rotate away and expand toward the
 * edges ("loose"), which reads as a rolling, dynamic scroll effect.
 *
 * The frame also resizes per section: each section's content has a different
 * footprint, so the innermost frame's half-extents interpolate between the
 * sections' measured sizes as you travel, and the whole nest follows. This
 * module owns:
 *   - the per-ring metadata + a size-parameterised rounded-square path builder,
 *   - the per-section frame sizes and the depth → size interpolation,
 *   - the scalar `convergence` mapping (0 = loose, 1 = framed),
 *   - the per-ring scale / rotation / opacity derivation from that scalar.
 *
 * Geometry is centred on (0, 0); the consumer places it at the viewport centre
 * with a static SVG translate so transforms scale/rotate about the centre.
 */

// Matte, sedated primaries — same palette the previous PencilSketchField used,
// so the page still reads of-a-piece. Held constant across all sections.
export const FRAME_BLUE = "#5b7a9e";
export const FRAME_RED = "#a85b4c";
export const FRAME_GREEN = "#71896b";
export const FRAME_COLORS = [FRAME_BLUE, FRAME_RED, FRAME_GREEN] as const;

/** SVG viewBox the rings are authored against (matches the host <svg>). */
export const FRAME_VIEWBOX_WIDTH = 1440;
export const FRAME_VIEWBOX_HEIGHT = 900;
export const FRAME_CENTER_X = FRAME_VIEWBOX_WIDTH / 2;
export const FRAME_CENTER_Y = FRAME_VIEWBOX_HEIGHT / 2;

const RING_COUNT = 5;
const INNER_CORNER_RADIUS = 28; // innermost frame corner radius
const RING_STEP = 80; // margin added per ring on every side

/** Half-extents of the innermost frame about the centre (viewBox units). */
export interface FrameSize {
  hw: number;
  hh: number;
}

/**
 * Per-section innermost-frame sizes, indexed by `anchorIndex`. Derived from the
 * measured on-screen content footprint of each section at the 1440×900 design
 * size (content centres on the viewport), plus ~70px / ~58px of padding so the
 * frame sits just outside the content. The frame interpolates between these as
 * the camera travels, so it hugs each section's content shape.
 *
 *   0 Hero · 1 Work · 2 Services · 3 About · 4 Process · 5 Contact
 */
export const FRAME_SECTION_SIZES: readonly FrameSize[] = [
  { hw: 563, hh: 341 }, // Hero     (content ~986×565)
  { hw: 622, hh: 389 }, // Work     (content ~1104×661 — widest)
  { hw: 502, hh: 314 }, // Services (content ~864×512)
  { hw: 502, hh: 331 }, // About    (content ~864×546)
  { hw: 438, hh: 363 }, // Process  (content ~736×610 — squarest)
  { hw: 374, hh: 263 }, // Contact  (content ~608×410 — smallest)
] as const;

export interface RingSpec {
  color: string;
  strokeWidth: number;
  /** Margin (per side) this ring adds outside the innermost frame. */
  inset: number;
  /** Extra scale applied when fully loose (convergence = 0). */
  expand: number;
  /** Degrees this ring is rotated when fully loose (the "roll"); 0 when framed. */
  rollDeg: number;
  /** Per-ring opacity multiplier (inner rings sit stronger — they are the frame). */
  baseOpacity: number;
}

// Opacity endpoints for the group (stroke is the only paint, fill is none).
const LOOSE_OPACITY = 0.07;
const FRAMED_OPACITY = 0.6;

export function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Centred rounded-rectangle path with corner radius `r` (clamped). */
function roundedRectPath(hw: number, hh: number, r: number): string {
  const rad = Math.min(r, hw, hh);
  const n = (v: number) => v.toFixed(2);
  return [
    `M ${n(-hw + rad)} ${n(-hh)}`,
    `L ${n(hw - rad)} ${n(-hh)}`,
    `Q ${n(hw)} ${n(-hh)} ${n(hw)} ${n(-hh + rad)}`,
    `L ${n(hw)} ${n(hh - rad)}`,
    `Q ${n(hw)} ${n(hh)} ${n(hw - rad)} ${n(hh)}`,
    `L ${n(-hw + rad)} ${n(hh)}`,
    `Q ${n(-hw)} ${n(hh)} ${n(-hw)} ${n(hh - rad)}`,
    `L ${n(-hw)} ${n(-hh + rad)}`,
    `Q ${n(-hw)} ${n(-hh)} ${n(-hw + rad)} ${n(-hh)}`,
    "Z",
  ].join(" ");
}

/**
 * Build the concentric ring metadata. Ring 0 is the innermost content frame;
 * each subsequent ring insets a constant margin and rolls/expands more, so the
 * nest rolls in as a staggered cascade. The actual path for each ring is built
 * from the (animated) frame size via `ringPath`.
 */
export function buildRings(): RingSpec[] {
  const rings: RingSpec[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    rings.push({
      color: FRAME_COLORS[i % FRAME_COLORS.length],
      strokeWidth: Math.max(0.9, 2 - i * 0.26),
      inset: i * RING_STEP,
      // Outer rings fly further toward the edges when loose.
      expand: 0.14 + i * 0.17,
      // Alternate the roll direction and grow it outward for a layered cascade.
      rollDeg: (i % 2 === 0 ? 1 : -1) * (10 + i * 13),
      baseOpacity: 1 - i * 0.15,
    });
  }
  return rings;
}

/** The rounded-square path for one ring at a given innermost frame size. */
export function ringPath(hw: number, hh: number, ring: RingSpec): string {
  return roundedRectPath(
    hw + ring.inset,
    hh + ring.inset,
    INNER_CORNER_RADIUS + ring.inset
  );
}

/**
 * Innermost frame size for a continuous travel depth, interpolating between the
 * two sections the camera sits between. Anchors sit on multiples of `sceneGap`
 * in `anchorIndex` order, and the rail loops, so the last section blends back to
 * the first across the loop seam.
 */
export function frameSizeAtDepth(
  depth: number,
  sceneGap: number,
  sizes: readonly FrameSize[] = FRAME_SECTION_SIZES
): FrameSize {
  const n = sizes.length;
  if (n === 0) return { hw: 0, hh: 0 };
  if (n === 1 || sceneGap <= 0) return { hw: sizes[0].hw, hh: sizes[0].hh };
  const u = depth / sceneGap;
  const i0 = Math.floor(u);
  const frac = u - i0;
  const a = ((i0 % n) + n) % n;
  const b = (a + 1) % n;
  return {
    hw: sizes[a].hw + (sizes[b].hw - sizes[a].hw) * frac,
    hh: sizes[a].hh + (sizes[b].hh - sizes[a].hh) * frac,
  };
}

/**
 * Modular distance from a continuous depth to the nearest anchor. Anchors sit
 * on multiples of `sceneGap`; this folds the rail's rebase offset in naturally
 * because it operates on the already-rebased `travelDepth`.
 */
export function nearestAnchorDistance(depth: number, sceneGap: number): number {
  if (sceneGap <= 0) return 0;
  const m = ((depth % sceneGap) + sceneGap) % sceneGap;
  return Math.min(m, sceneGap - m);
}

/**
 * Map "how close are we to a section" to a convergence scalar in [0, 1].
 * 1 at an anchor (framed), 0 at the midpoint between anchors (loose), eased.
 */
export function convergenceFromProximity(
  distanceToNearestAnchor: number,
  sceneGap: number
): number {
  if (sceneGap <= 0) return 1;
  const half = sceneGap / 2;
  const normalized = clamp01(distanceToNearestAnchor / half);
  return smoothstep(1 - normalized);
}

/** Convenience: depth → convergence in one step (rail host). */
export function convergenceFromDepth(depth: number, sceneGap: number): number {
  return convergenceFromProximity(nearestAnchorDistance(depth, sceneGap), sceneGap);
}

/** Per-ring scale. 1 when framed (convergence = 1); expands when loose. */
export function ringScale(convergence: number, ring: RingSpec): number {
  return 1 + (1 - clamp01(convergence)) * ring.expand;
}

/** Per-ring rotation in degrees. 0 when framed; full roll when loose. */
export function ringRotation(convergence: number, ring: RingSpec): number {
  return (1 - clamp01(convergence)) * ring.rollDeg;
}

/** Per-ring group opacity, blended between loose and framed endpoints. */
export function ringOpacity(convergence: number, ring: RingSpec): number {
  const c = clamp01(convergence);
  return (LOOSE_OPACITY + c * (FRAMED_OPACITY - LOOSE_OPACITY)) * ring.baseOpacity;
}

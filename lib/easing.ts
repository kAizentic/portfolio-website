/**
 * Shared easing curves used by motion tokens.
 *
 * Rail-camera narrative: these shape the camera's acceleration profile
 * during programmatic rail travel and docking. They are deliberately plain
 * and replaceable; the prototype's motion contract is satisfied as long as
 * programmatic travel uses a duration-based easing function (not lerp).
 */

export type EasingFn = (t: number) => number;

/** Accelerate → decelerate. Used for keyboard rail travel. */
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Stronger accelerate → decelerate. Used for menu rail travel. */
export const easeInOutQuint: EasingFn = (t) =>
  t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;

/** Pure decelerate. Used for gentle docking. */
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

/** Soft decelerate. Used for keyboard step travel. */
export const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);

/** Strong arrival deceleration. Used for manual assisted docking. */
export const easeOutExpo: EasingFn = (t) =>
  t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

/** Linear; used by reduced-motion short transitions and tests. */
export const linear: EasingFn = (t) => t;

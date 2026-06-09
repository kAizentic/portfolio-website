"use client";

/**
 * Reports whether the viewport is phone-sized (`max-width: 767px`, i.e. below
 * Tailwind's `md` breakpoint). Used at the page root to choose between the
 * desktop rail-camera experience and the mobile continuous-page layout.
 *
 * Returns `null` for the server render and the first hydration pass, then the
 * resolved boolean. Callers render a neutral placeholder while it is `null` so
 * the heavy desktop rail (Lenis, controller) is never mounted on a phone — and
 * vice versa — avoiding a mount-then-swap flash.
 *
 * Implemented with `useSyncExternalStore` (like `useReducedMotion`) so the
 * media-query subscription is registered through React's external-store
 * primitive rather than via setState-in-effect.
 */

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

const subscribe = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;

// Null on the server and during the first hydration render so the initial
// client render matches the server markup; React then re-renders with the
// real client snapshot.
const getServerSnapshot = (): boolean | null => null;

export const useIsMobile = (): boolean | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

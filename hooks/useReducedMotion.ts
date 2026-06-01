"use client";

/**
 * Subscribes to `prefers-reduced-motion: reduce`. Returns `true` whenever
 * the user requests reduced motion. The spatial controller pins continuous
 * scale and blur to focus values and shortens programmatic travel when
 * this is true.
 *
 * Implemented with `useSyncExternalStore` so React 19 strict mode and the
 * `react-hooks/set-state-in-effect` lint rule are both satisfied: the
 * media-query subscription is registered through React's external-store
 * primitive rather than via setState-in-effect.
 */

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const getSnapshot = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
};

const getServerSnapshot = (): boolean => false;

export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

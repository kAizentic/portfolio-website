"use client";

/**
 * Lightweight context holding the developer-facing Environment ON/OFF toggle.
 *
 * Deliberately separate from the spatial controller because the environment
 * is a *visual proof* layer: enabling/disabling it must not change scroll,
 * camera, or controller state in any way. Persists to localStorage so the
 * choice survives reloads during visual review.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface EnvironmentContextValue {
  enabled: boolean;
  setEnabled(next: boolean): void;
  toggle(): void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

const STORAGE_KEY = "spatial-environment-enabled";

const readInitial = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
};

export function EnvironmentProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  // Lazy init — readInitial is SSR-safe; the value gets re-read at hydration
  // so the toggle survives reloads. EnvironmentLayer doesn't mount until
  // `initialized === true` (a client-only event), so there is no SSR/CSR
  // mismatch concern even though localStorage is unavailable during SSR.
  const [enabled, setEnabledState] = useState<boolean>(readInitial);

  const setEnabled = useCallback((next: boolean): void => {
    setEnabledState(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignored — visual-only fallback */
    }
  }, []);

  const toggle = useCallback((): void => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const value = useMemo<EnvironmentContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle]
  );

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export const useEnvironmentToggle = (): EnvironmentContextValue => {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    throw new Error(
      "useEnvironmentToggle must be used inside <EnvironmentProvider>"
    );
  }
  return ctx;
};

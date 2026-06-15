"use client";

/**
 * Site theme state. The source of truth is `data-theme` on <html> — set
 * before hydration by the inline script in app/layout.tsx (reading
 * localStorage), and toggled at runtime by `setTheme`. `useTheme` subscribes
 * through `useSyncExternalStore` with a MutationObserver, so the server
 * snapshot ("dark") never causes a hydration mismatch and every subscriber
 * re-renders when the attribute changes.
 */

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";

const subscribe = (callback: () => void): (() => void) => {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const getServerSnapshot = (): Theme => "dark";

export const useTheme = (): Theme =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") {
    root.dataset.theme = "light";
  } else {
    delete root.dataset.theme;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the toggle still works
    // for the session.
  }
}

export function toggleTheme(): void {
  setTheme(
    document.documentElement.dataset.theme === "light" ? "dark" : "light",
  );
}

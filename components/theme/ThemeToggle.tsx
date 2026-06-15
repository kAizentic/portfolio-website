"use client";

/**
 * Theme toggle — sun (switch to light) / moon (switch to dark). Styled with
 * the same chrome tokens as the nav bars it sits in, so it reads correctly
 * in both themes.
 */

import { toggleTheme, useTheme } from "@/components/theme/theme";

export function ThemeToggle({
  className = "",
}: {
  className?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const light = theme === "light";

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title={light ? "Switch to dark theme" : "Switch to light theme"}
      onClick={toggleTheme}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink/60 transition-colors hover:border-ink/40 hover:text-ink ${className}`}
    >
      {light ? (
        // Moon — offered action: go dark.
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun — offered action: go light.
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22" y2="12" />
          <line x1="4.6" y1="4.6" x2="6.4" y2="6.4" />
          <line x1="17.6" y1="17.6" x2="19.4" y2="19.4" />
          <line x1="4.6" y1="19.4" x2="6.4" y2="17.6" />
          <line x1="17.6" y1="6.4" x2="19.4" y2="4.6" />
        </svg>
      )}
    </button>
  );
}

"use client";

interface GradientTextProps {
  children: React.ReactNode;
  /**
   * Gradient color stops, left to right. Defaults to the theme's brand
   * palette (`--gt-*` tokens: violet in dark, slate in light).
   */
  colors?: string[];
  /** Seconds for one full cycle of the gradient slide. */
  animationSpeed?: number;
  className?: string;
}

const THEME_STOPS = [
  "var(--gt-a)",
  "var(--gt-b)",
  "var(--gt-c)",
  "var(--gt-d)",
  "var(--gt-a)",
];

/**
 * React Bits "Gradient Text" — an animated multi-stop gradient clipped to the
 * text glyphs. Inherits font and size from its parent (see `.gradient-text` in
 * globals.css).
 */
export function GradientText({
  children,
  colors = THEME_STOPS,
  animationSpeed = 8,
  className = "",
}: GradientTextProps): React.JSX.Element {
  return (
    <span
      className={`gradient-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
        animationDuration: `${animationSpeed}s`,
      }}
    >
      {children}
    </span>
  );
}

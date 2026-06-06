"use client";

interface GradientTextProps {
  children: React.ReactNode;
  /** Gradient color stops, left to right. Defaults to the violet brand palette. */
  colors?: string[];
  /** Seconds for one full cycle of the gradient slide. */
  animationSpeed?: number;
  className?: string;
}

/**
 * React Bits "Gradient Text" — an animated multi-stop gradient clipped to the
 * text glyphs. Inherits font and size from its parent (see `.gradient-text` in
 * globals.css).
 */
export function GradientText({
  children,
  colors = ["#7C3AED", "#c084fc", "#6366f1", "#a78bfa", "#7C3AED"],
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

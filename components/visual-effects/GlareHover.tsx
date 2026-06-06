"use client";

interface GlareHoverProps {
  children?: React.ReactNode;
  /** Hex glare color (#rgb or #rrggbb). */
  glareColor?: string;
  /** Glare alpha, 0–1. */
  glareOpacity?: number;
  /** Sweep angle in degrees. */
  glareAngle?: number;
  /** Glare band size as a percentage. */
  glareSize?: number;
  /** Sweep duration in ms. */
  transitionDuration?: number;
  /** Only animate the sweep on hover-in (no reverse on hover-out). */
  playOnce?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React Bits "Glare Hover" — a diagonal highlight sweeps across the element on
 * hover. Sizing, radius, and background come from the caller's `className`;
 * this wrapper only supplies the clipped glare overlay (see `.glare-hover` in
 * globals.css).
 */
export function GlareHover({
  children,
  glareColor = "#ffffff",
  glareOpacity = 0.5,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  className = "",
  style = {},
}: GlareHoverProps): React.JSX.Element {
  const hex = glareColor.replace("#", "");
  let rgba = glareColor;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  } else if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  }

  const vars = {
    "--gh-angle": `${glareAngle}deg`,
    "--gh-duration": `${transitionDuration}ms`,
    "--gh-size": `${glareSize}%`,
    "--gh-rgba": rgba,
  } as React.CSSProperties;

  return (
    <div
      className={`glare-hover ${playOnce ? "glare-hover--play-once" : ""} ${className}`}
      style={{ ...vars, ...style }}
    >
      {children}
    </div>
  );
}

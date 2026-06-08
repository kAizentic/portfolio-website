"use client";

interface StarBorderProps {
  children?: React.ReactNode;
  /** Star/glow color (any CSS color; defaults to the brand accent). */
  color?: string;
  /** Orbit duration, e.g. "6s". */
  speed?: string;
  /** Border thickness in px (vertical inset of the inner content). */
  thickness?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React Bits "Star Border" — two soft radial "stars" sweep along the top and
 * bottom edges, giving the box an animated glowing border. Sizing, radius, and
 * background come from the caller's `className` / children; this wrapper only
 * supplies the clipped moving glow (see `.star-border` in globals.css).
 */
export function StarBorder({
  children,
  color = "var(--accent)",
  speed = "6s",
  thickness = 1,
  className = "",
  style = {},
}: StarBorderProps): React.JSX.Element {
  const vars = {
    "--sb-color": color,
    "--sb-speed": speed,
  } as React.CSSProperties;

  return (
    <div
      className={`star-border ${className}`}
      style={{ padding: `${thickness}px 0`, ...vars, ...style }}
    >
      <div className="star-border__movement star-border__movement--bottom" />
      <div className="star-border__movement star-border__movement--top" />
      <div className="star-border__content">{children}</div>
    </div>
  );
}

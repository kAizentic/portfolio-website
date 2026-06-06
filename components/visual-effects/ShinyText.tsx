"use client";

interface ShinyTextProps {
  text: string;
  /** Seconds for one full sweep of the highlight. */
  speed?: number;
  className?: string;
}

/**
 * React Bits "Shiny Text" — a highlight band sweeps across gradient-clipped
 * text. Inherits font, size, and tracking from its parent; the gradient is
 * tinted to the brand accent (see `.shiny-text` in globals.css).
 */
export function ShinyText({
  text,
  speed = 5,
  className = "",
}: ShinyTextProps): React.JSX.Element {
  return (
    <span
      className={`shiny-text ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {text}
    </span>
  );
}

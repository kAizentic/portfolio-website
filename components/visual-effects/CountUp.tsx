"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "motion/react";

interface CountUpProps {
  /** Target value to count to. */
  to: number;
  /** Value to count from. Defaults to 0. */
  from?: number;
  /** Animation duration in seconds (drives spring stiffness/damping). */
  duration?: number;
  /** Delay in seconds before counting begins. */
  delay?: number;
  /** When true the count runs; when false it resets to `from`. */
  startWhen?: boolean;
  /** Thousands separator, e.g. "," — omit for none. */
  separator?: string;
  className?: string;
}

/**
 * React Bits "Count Up" — springs a number from `from` to `to` whenever
 * `startWhen` becomes true. Resets when `startWhen` goes false so the count
 * replays each time the section is re-focused.
 */
export function CountUp({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  startWhen = true,
  separator = "",
  className = "",
}: CountUpProps): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });

  // Seed the initial text so it reads `from` before the spring starts.
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = String(from);
    }
  }, [from]);

  // Start (or reset) the count based on focus.
  useEffect(() => {
    if (startWhen) {
      const timer = setTimeout(() => motionValue.set(to), delay * 1000);
      return () => clearTimeout(timer);
    }
    motionValue.set(from);
  }, [startWhen, motionValue, to, from, delay]);

  // Paint each spring tick into the span as formatted text.
  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (!ref.current) return;
      const formatted = Intl.NumberFormat("en-US", {
        useGrouping: Boolean(separator),
      }).format(Math.round(latest));
      ref.current.textContent = separator
        ? formatted.replace(/,/g, separator)
        : formatted;
    });
    return () => unsubscribe();
  }, [springValue, separator]);

  return <span ref={ref} className={className} />;
}

"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import type { SpringOptions } from "motion/react";

const springValues: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

interface TiltedCardProps {
  children: React.ReactNode;
  /** Max tilt in degrees at the card edges. */
  rotateAmplitude?: number;
  /** Scale applied while hovered. */
  scaleOnHover?: number;
  /** 3D perspective depth in px. */
  perspective?: number;
  /** Classes for the perspective wrapper (e.g. grid-item sizing). */
  className?: string;
}

/**
 * React Bits "Tilted Card" — tilts toward the cursor in 3D on hover. Generic
 * wrapper: the perspective lives on the outer element and the tilt transform on
 * an inner motion layer, so any card content can be dropped in as children.
 */
export function TiltedCard({
  children,
  rotateAmplitude = 12,
  scaleOnHover = 1.05,
  perspective = 800,
  className = "",
}: TiltedCardProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>): void {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
  }

  function handleMouseEnter(): void {
    scale.set(scaleOnHover);
  }

  function handleMouseLeave(): void {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: `${perspective}px` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="h-full w-full"
        style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

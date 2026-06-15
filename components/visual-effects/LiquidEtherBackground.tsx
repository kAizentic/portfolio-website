"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/components/theme/theme";

const LiquidEther = dynamic(() => import("./LiquidEther"), { ssr: false });

// Hoisted so the array reference is stable across renders — a fresh literal
// would otherwise re-fire LiquidEther's heavy WebGL init effect (`colors` is
// in its dependency array).
const LIQUID_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

function LiquidEtherBackgroundImpl(): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const theme = useTheme();
  // Dark-theme-only: the violet fluid clashes with the aged-paper light
  // theme, which shows the pencil-sketch field instead.
  if (reduced || theme === "light") return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 hidden sm:block"
      aria-hidden="true"
    >
      <LiquidEther
        colors={LIQUID_COLORS}
        autoDemo
        autoSpeed={0.5}
        autoIntensity={2.2}
        resolution={0.5}
      />
    </div>
  );
}

// memo so unrelated parent re-renders (focus/nav state changes propagated
// through Scene01Hero) do not re-render the WebGL host.
export const LiquidEtherBackground = memo(LiquidEtherBackgroundImpl);

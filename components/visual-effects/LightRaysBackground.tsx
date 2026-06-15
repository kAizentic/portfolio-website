"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/components/theme/theme";

const LightRays = dynamic(() => import("./LightRays"), { ssr: false });

// Electric-violet accent (dark-theme `--accent`), hoisted so the prop reference
// is stable across renders and the OGL init effect does not re-fire.
const RAYS_COLOR = "#7C3AED";

// The Hero encounter is anchorIndex 0 (sceneComponents[0]) and keeps its own
// LiquidEther fluid; the rays back only Work/Services/About/Process/Contact.
const HERO_ANCHOR_INDEX = 0;

/**
 * Dark-theme rail background: a single React Bits "Light Rays" canvas sweeping
 * in from the right edge, shared across all encounters. There is one WebGL
 * context (not one per scene), gated behind the scene layer at z-0. It fades
 * out while the Hero is focused so the Hero's fluid look is preserved, and
 * fades back in for the other five sections. Desktop + dark theme only; light
 * theme shows the ConcentricFrameField instead.
 */
function LightRaysBackgroundImpl(): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const theme = useTheme();
  const {
    state: { focusedAnchorIndex },
  } = useSpatialController();

  if (reduced || theme !== "dark") return null;

  const onHero = focusedAnchorIndex === HERO_ANCHOR_INDEX;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden transition-opacity duration-700 ease-out sm:block"
      style={{ opacity: onHero ? 0 : 1 }}
    >
      <LightRays
        raysOrigin="right"
        raysColor={RAYS_COLOR}
        raysSpeed={0.8}
        lightSpread={1.1}
        rayLength={2}
        fadeDistance={1.2}
        followMouse
        mouseInfluence={0.08}
      />
    </div>
  );
}

// memo so unrelated parent re-renders do not re-render the WebGL host; context
// changes (focusedAnchorIndex) still flow through to toggle the fade.
export const LightRaysBackground = memo(LightRaysBackgroundImpl);

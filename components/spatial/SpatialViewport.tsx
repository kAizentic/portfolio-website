"use client";

/**
 * SpatialViewport — top-level orchestrator.
 *
 * Mounts <ReactLenis root> so all descendants share one Lenis instance, then
 * mounts <SpatialControllerProvider> so the rail camera and per-scene motion
 * surfaces all read from one controller. Validates the config once in dev.
 *
 * Required nesting (from approved contract):
 *
 *   <SpatialViewport>
 *     <ReactLenis root>
 *       <SpatialControllerProvider>
 *         <ScrollSurface />
 *         <SceneLayer> SceneFrame × N </SceneLayer>
 *         <SceneNav />
 *         <DiagnosticOverlay />
 *         <StandardViewToggle />
 *         <KeyboardTravelMount />
 *       </SpatialControllerProvider>
 *     </ReactLenis>
 *   </SpatialViewport>
 *
 * Note: `infinite: true` is deliberately *not* set on Lenis. Looping is
 * provided by our multi-cycle physical surface plus the rebase offset
 * model; that is the only loop mechanism in this prototype.
 */

import { ReactLenis } from "lenis/react";
import { useMemo } from "react";

import { DiagnosticOverlay } from "@/components/spatial/DiagnosticOverlay";
import { SceneLayer } from "@/components/spatial/SceneLayer";
import { SceneNav } from "@/components/spatial/SceneNav";
import { ScrollSurface } from "@/components/spatial/ScrollSurface";
import { SpatialControllerProvider } from "@/components/spatial/SpatialControllerContext";
import { StandardViewToggle } from "@/components/spatial/StandardViewToggle";
import { useKeyboardTravel } from "@/hooks/useKeyboardTravel";
import { assertValidSpatialConfig } from "@/lib/config-validation";
import type { SpatialConfig } from "@/types/spatial";

import type { LenisOptions } from "lenis";

/**
 * Lenis options. Manual wheel/touch keeps the default smoothing (lerp 0.1).
 * Programmatic travel routes through `programmaticScrollOptions` in the
 * controller, which sets duration+easing and explicit `lerp: 0` so the
 * duration-based animation is authoritative.
 *
 * `infinite: false` is forbidden by contract — the multi-cycle surface plus
 * rebase model is the only loop mechanism.
 */
function KeyboardTravelMount(): null {
  useKeyboardTravel();
  return null;
}

export function SpatialViewport({
  config,
}: {
  config: SpatialConfig;
}): React.JSX.Element {
  // Validate once per mount in dev. In production we still validate (cheap),
  // since invariant violations would otherwise produce silent visible bugs.
  useMemo(() => assertValidSpatialConfig(config), [config]);

  const lenisOptions = useMemo<LenisOptions>(() => {
    const signedGain =
      config.motion.manualTravel.forwardScrollSign *
      config.motion.manualTravel.inputGain;
    return {
      smoothWheel: true,
      syncTouch: false,
      infinite: false,
      autoRaf: true,
      gestureOrientation: "vertical",
      orientation: "vertical",
      wheelMultiplier: signedGain,
      touchMultiplier: signedGain,
    };
  }, [
    config.motion.manualTravel.inputGain,
    config.motion.manualTravel.forwardScrollSign,
  ]);

  return (
    <div
      data-testid="spatial-viewport"
      data-display-mode={config.displayMode}
      className="relative min-h-dvh w-full bg-[#050507] text-white"
    >
      <ReactLenis root options={lenisOptions}>
        <SpatialControllerProvider config={config}>
          <ScrollSurface />
          <SceneLayer />
          <SceneNav />
          <DiagnosticOverlay />
          <StandardViewToggle />
          <KeyboardTravelMount />
        </SpatialControllerProvider>
      </ReactLenis>
    </div>
  );
}

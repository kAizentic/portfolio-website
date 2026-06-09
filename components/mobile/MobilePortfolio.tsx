"use client";

/**
 * MobilePortfolio — the phone layout (below Tailwind's `md` breakpoint).
 *
 * Instead of the desktop rail-camera (fixed viewport + Lenis + 3D depth
 * transforms), this renders the same six scenes as a traditional continuous
 * page: each scene is a normal-flow `<section>` stacked top to bottom and
 * scrolled natively. The scene components are reused verbatim — they just
 * receive a `layout: "flow"` render context, which switches each one to its
 * natural-height, always-visible presentation. No Lenis, no controller, no
 * rebase model is mounted here.
 *
 * `navigateTo` (used by the hero CTAs and the header) scroll-jumps to the
 * matching section, mirroring the rail's `actions.travelTo` contract.
 */

import { useCallback } from "react";

import { MobileNav } from "@/components/mobile/MobileNav";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SceneRenderContext, SpatialConfig } from "@/types/spatial";

function sectionId(anchorIndex: number): string {
  return `encounter-${anchorIndex}`;
}

export function MobilePortfolio({
  config,
}: {
  config: SpatialConfig;
}): React.JSX.Element {
  const reducedMotion = useReducedMotion();

  const navigateTo = useCallback(
    (anchorIndex: number) => {
      const el = document.getElementById(sectionId(anchorIndex));
      el?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [reducedMotion]
  );

  return (
    <div
      data-testid="mobile-portfolio"
      data-display-mode={config.displayMode}
      className="relative min-h-dvh w-full bg-[#050507] text-white"
    >
      <MobileNav scenes={config.scenes} onNavigate={navigateTo} />

      <main>
        {config.scenes.map((scene) => {
          const ctx: SceneRenderContext = {
            scene,
            layout: "flow",
            navigateTo,
            // Flow content lays itself out at natural height and is always
            // visible, so the rail's depth/atmosphere values are neutral.
            baseAnchorDepth: 0,
            equivalentAnchorDepth: 0,
            relativeDepth: 0,
            focused: true,
            computed: {
              opacity: 1,
              scale: 1,
              blurPx: 0,
              translateZ: 0,
              pointerEvents: "auto",
            },
          };

          return (
            <section
              key={scene.id}
              id={sectionId(scene.anchorIndex)}
              data-anchor-index={scene.anchorIndex}
              // Offset scroll targets below the sticky header.
              className="scroll-mt-[88px]"
            >
              {config.renderSceneContent(ctx)}
            </section>
          );
        })}
      </main>
    </div>
  );
}

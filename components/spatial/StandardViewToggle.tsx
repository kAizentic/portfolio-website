"use client";

/**
 * StandardViewToggle — a visible-but-nonfunctional control reserved for a
 * future standard (non-spatial) view of the same content. Required by the
 * accessibility brief; renders only when `config.showStandardViewToggle`.
 */

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";

export function StandardViewToggle(): React.JSX.Element | null {
  const {
    config,
    state: { initialized },
  } = useSpatialController();
  if (!initialized) return null;
  if (!config.showStandardViewToggle) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <button
        type="button"
        data-testid="standard-view-toggle"
        aria-disabled="true"
        title="Standard view — coming soon"
        onClick={(event) => event.preventDefault()}
        className="cursor-not-allowed rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-white/60 opacity-70 backdrop-blur-md"
      >
        Standard view · coming soon
      </button>
    </div>
  );
}

"use client";

/**
 * EnvironmentToggle — developer-facing ON/OFF control for the environmental
 * depth-cue layer. Temporary: present only so the same camera mechanics can
 * be visually compared with and without environmental cues.
 *
 * Toggling has no controller / camera / scroll effect — only visual presence
 * of the environment layer changes.
 */

import { useEnvironmentToggle } from "@/components/environment/EnvironmentContext";
import { useSpatialController } from "@/components/spatial/SpatialControllerContext";

export function EnvironmentToggle(): React.JSX.Element | null {
  const {
    state: { initialized },
  } = useSpatialController();
  const { enabled, toggle } = useEnvironmentToggle();

  if (!initialized) return null;

  return (
    <div className="fixed bottom-4 right-44 z-30">
      <button
        type="button"
        data-testid="environment-toggle"
        data-environment-enabled={enabled ? "true" : "false"}
        aria-pressed={enabled}
        onClick={toggle}
        title="Toggle environmental depth cues (developer-only)"
        className="rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-white/75 backdrop-blur-md transition-colors hover:bg-black/70"
      >
        Environment · {enabled ? "on" : "off"}
      </button>
    </div>
  );
}

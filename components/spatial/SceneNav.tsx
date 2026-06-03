"use client";

/**
 * SceneNav — encounter index rail. Clicking a label initiates accelerated
 * rail travel to that anchor via `controller.travelTo`. The targeted
 * equivalent is chosen by the controller through `closestEquivalentAnchor`,
 * always taking the shortest circular route on the looped rail.
 */

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";

export function SceneNav(): React.JSX.Element | null {
  const {
    config,
    actions,
    state: { initialized, focusedAnchorIndex, navigationState },
  } = useSpatialController();
  if (!initialized) return null;

  const travelLocked =
    navigationState === "menu" || navigationState === "keyboard";

  return (
    <nav
      data-testid="scene-nav"
      aria-label="Encounter anchor index"
      className="fixed top-0 inset-x-0 z-30 bg-black/55 backdrop-blur-md border-b border-white/10"
    >
      <ul className="flex flex-row items-center justify-center gap-3 px-6 py-3">
        {config.scenes.map((scene, index) => {
          const isFocused = index === focusedAnchorIndex;
          return (
            <li key={scene.id}>
              <button
                type="button"
                data-testid={`scene-nav-${scene.navLabel}`}
                data-anchor-index={scene.anchorIndex}
                data-focused={isFocused ? "true" : "false"}
                aria-current={isFocused ? "true" : undefined}
                disabled={travelLocked}
                onClick={() => actions.travelTo(scene.anchorIndex)}
                className={[
                  "min-w-[72px] rounded-full px-4 py-2 text-center font-mono text-[11px] tracking-[0.12em] backdrop-blur-md transition-all duration-300",
                  "border bg-black/55",
                  isFocused ? "border-white/30" : "border-white/15",
                  isFocused ? "" : "text-white/45 hover:border-white/35 hover:text-white/75",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
                style={
                  isFocused
                    ? {
                        borderColor: "var(--accent-border)",
                        backgroundColor: "var(--accent-subtle)",
                        color: "var(--accent)",
                      }
                    : undefined
                }
              >
                {scene.navLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

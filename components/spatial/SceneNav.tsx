"use client";

/**
 * SceneNav — persistent numeric encounter index ("01"…"06"). Clicking a
 * label initiates accelerated rail travel to that encounter anchor via
 * `controller.travelTo`. The targeted equivalent of the anchor is chosen
 * by the controller through `closestEquivalentAnchor`, so menu travel
 * always takes the shortest circular route on the looped rail.
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
      className="fixed right-6 top-1/2 z-30 -translate-y-1/2"
    >
      <ul className="flex flex-col gap-2">
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
                  "w-12 rounded-full px-3 py-2 text-center font-mono text-[12px] tracking-[0.18em] backdrop-blur-md transition-colors",
                  "border border-white/20 bg-black/55 text-white/70",
                  "hover:border-white/55 hover:text-white",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isFocused
                    ? "border-white bg-white/15 text-white"
                    : "",
                ].join(" ")}
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

"use client";

/**
 * Keyboard rail-travel bindings.
 *
 * Direction is keyed off `motion.manualTravel.forwardScrollSign` so wheel input
 * and keyboard share one mental model:
 *
 *   forwardScrollSign = -1 (rail-camera default, scroll-UP is forward):
 *     ArrowUp   / ArrowLeft  → stepBy(+1)  (next encounter, forward along rail)
 *     ArrowDown / ArrowRight → stepBy(-1)  (previous encounter, backward)
 *
 *   forwardScrollSign = +1 (document convention, scroll-DOWN is forward):
 *     ArrowDown / ArrowRight → stepBy(+1)
 *     ArrowUp   / ArrowLeft  → stepBy(-1)
 *
 *   Home → goHome()  (Scene 01 / anchor 0)        absolute, sign-independent
 *   End  → goEnd()   (Scene 06 / anchor N-1)      absolute, sign-independent
 *
 * Travel cannot be triggered while another programmatic mode is in flight
 * (the controller's travelTo / stepBy / goHome / goEnd early-return on
 * `navigationState ∈ {"menu","keyboard"}`).
 *
 * Keys are ignored when focus is inside a form field (input, textarea,
 * select, contentEditable). The encounter index buttons themselves
 * intentionally fall through so users can step from a focused nav button.
 */

import { useEffect } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";

const isFormElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
};

export const useKeyboardTravel = (): void => {
  const { actions, config } = useSpatialController();
  const forwardSign = config.motion.manualTravel.forwardScrollSign;

  useEffect(() => {
    const upDirection: -1 | 1 = forwardSign === -1 ? 1 : -1;
    const downDirection: -1 | 1 = (-upDirection) as -1 | 1;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isFormElement(event.target)) return;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          actions.stepBy(downDirection);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          actions.stepBy(upDirection);
          break;
        case "Home":
          event.preventDefault();
          actions.goHome();
          break;
        case "End":
          event.preventDefault();
          actions.goEnd();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, forwardSign]);
};

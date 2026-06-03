import { Scene01Hero } from "@/components/scenes/Scene01Hero";
import { Scene02Work } from "@/components/scenes/Scene02Work";
import { Scene03Services } from "@/components/scenes/Scene03Services";
import { Scene04About } from "@/components/scenes/Scene04About";
import { Scene05Process } from "@/components/scenes/Scene05Process";
import { Scene06Contact } from "@/components/scenes/Scene06Contact";
import { motionTokens } from "@/config/motion-tokens";
import { sceneManifest } from "@/config/scene-manifest";
import type { SceneRenderContext, SpatialConfig } from "@/types/spatial";
import type { ReactNode } from "react";

/**
 * Per-encounter content renderers.
 *
 * Each scene component is full-screen (`absolute inset-0`) and owns its own
 * layout. To add secondary elements at specific positions within a frame,
 * import FrameCanvas from "@/components/scenes/FrameCanvas" and compose it
 * inside the scene's renderSceneContent function.
 */
const sceneComponents: ((ctx: SceneRenderContext) => ReactNode)[] = [
  (ctx) => <Scene01Hero ctx={ctx} />,
  (ctx) => <Scene02Work ctx={ctx} />,
  (ctx) => <Scene03Services ctx={ctx} />,
  (ctx) => <Scene04About ctx={ctx} />,
  (ctx) => <Scene05Process ctx={ctx} />,
  (ctx) => <Scene06Contact ctx={ctx} />,
];

export const portfolioConfig: SpatialConfig = {
  scenes: sceneManifest,
  motion: motionTokens,
  displayMode: "production",
  renderSceneContent: (ctx) => sceneComponents[ctx.scene.anchorIndex]?.(ctx) ?? null,
  showDiagnostics: false,
  showStandardViewToggle: false,
};

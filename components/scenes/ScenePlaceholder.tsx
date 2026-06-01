"use client";

/**
 * Diagnostic encounter content.
 *
 * Renders a plain panel that prints the encounter anchor's identity and the
 * current computed visual mapping. This is *measurement scaffolding* — the
 * rail-camera prototype's environmental visual language will be supplied by
 * a future skeleton/production renderSceneContent. The data-testid attributes
 * exist so the Playwright suite can read controller-derived values without
 * coupling to text layout.
 */

import type { SceneRenderContext } from "@/types/spatial";

const fmt = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

export function ScenePlaceholder({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div
      data-testid={`scene-placeholder-${ctx.scene.id}`}
      data-anchor-index={ctx.scene.anchorIndex}
      data-focused={ctx.focused ? "true" : "false"}
      data-pointer-events={ctx.computed.pointerEvents}
      className="select-none rounded-2xl border border-white/15 bg-black/60 px-8 py-7 font-mono text-[12.5px] leading-relaxed text-white/85 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      style={{ minWidth: 340 }}
    >
      <div className="mb-4 flex items-baseline justify-between gap-6">
        <span className="text-[24px] font-semibold tracking-[0.28em] text-white">
          {ctx.scene.navLabel}
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">
          {ctx.scene.diagnosticLabel}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
        <dt className="text-white/45">scene.id</dt>
        <dd className="text-right">{ctx.scene.id}</dd>

        <dt className="text-white/45">anchor base depth</dt>
        <dd className="text-right">{fmt(ctx.baseAnchorDepth, 1)}</dd>

        <dt className="text-white/45">nearest equiv on rail</dt>
        <dd className="text-right">{fmt(ctx.equivalentAnchorDepth, 1)}</dd>

        <dt className="text-white/45">distance from camera</dt>
        <dd className="text-right">{fmt(ctx.relativeDepth, 1)}</dd>

        <dt className="text-white/45">in encounter zone</dt>
        <dd
          data-testid={`scene-${ctx.scene.id}-focused`}
          className="text-right"
        >
          {ctx.focused ? "yes" : "no"}
        </dd>

        <dt className="text-white/45">computed opacity</dt>
        <dd className="text-right">{fmt(ctx.computed.opacity, 3)}</dd>

        <dt className="text-white/45">computed scale</dt>
        <dd className="text-right">{fmt(ctx.computed.scale, 3)}</dd>

        <dt className="text-white/45">computed blur (px)</dt>
        <dd className="text-right">{fmt(ctx.computed.blurPx, 2)}</dd>

        <dt className="text-white/45">parallax depth (z)</dt>
        <dd className="text-right">{fmt(ctx.computed.translateZ, 1)}</dd>

        <dt className="text-white/45">pointer-events</dt>
        <dd
          data-testid={`scene-${ctx.scene.id}-pointer-events`}
          className="text-right"
        >
          {ctx.computed.pointerEvents}
        </dd>
      </dl>
    </div>
  );
}

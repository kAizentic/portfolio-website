"use client";

import { ThreadsBackground } from "@/components/visual-effects/ThreadsBackground";
import type { SceneRenderContext } from "@/types/spatial";

export function Scene01Hero({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0">
      <ThreadsBackground />

      <div className="relative z-10 flex h-full flex-col justify-center">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
          <div
            className="mb-8 flex items-center gap-3 transition-all duration-500"
            style={{ opacity: ctx.focused ? 1 : 0.45 }}
          >
            <span className="h-px w-10 bg-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-accent">
              Creative Studio
            </span>
          </div>

          <h1
            className="max-w-[640px] font-display text-[64px] font-semibold leading-[1.05] tracking-[-0.03em] text-white transition-all duration-700"
            style={{
              opacity: ctx.focused ? 1 : 0.75,
              transform: ctx.focused ? "translateY(0)" : "translateY(8px)",
            }}
          >
            We craft digital
            <br />
            experiences that
            <br />
            <span className="text-accent">leave a mark.</span>
          </h1>

          <p
            className="mt-7 max-w-[480px] text-[17px] leading-[1.75] text-white/50 transition-all duration-500"
            style={{ opacity: ctx.focused ? 1 : 0.6 }}
          >
            Forma is an independent design studio building brands, products, and
            spatial narratives for forward-thinking companies.
          </p>

          <div className="mt-9 flex items-center gap-5">
            <button
              type="button"
              className="rounded-full bg-accent px-8 py-3.5 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-accent-hover"
              style={{
                boxShadow: ctx.focused ? "0 0 36px var(--accent-glow)" : "none",
                transition: "box-shadow 0.7s ease, background-color 0.2s",
              }}
            >
              View Our Work
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 px-8 py-3.5 text-[13px] font-medium tracking-wide text-white/55 transition-colors hover:border-white/40 hover:text-white"
            >
              Get in Touch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

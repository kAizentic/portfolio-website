"use client";

import { ShinyText } from "@/components/visual-effects/ShinyText";
import type { SceneRenderContext } from "@/types/spatial";

const steps = [
  {
    num: "01",
    title: "Research",
    description:
      "Market intelligence, competitive analysis, and audience research — accelerated with AI-enabled workflows.",
  },
  {
    num: "02",
    title: "Positioning",
    description:
      "Positioning, messaging, and narrative that make complex technical products clear and compelling.",
  },
  {
    num: "03",
    title: "Activation",
    description:
      "Briefs, whitepapers, video, and digital experiences that power go-to-market and sales enablement.",
  },
  {
    num: "04",
    title: "Optimization",
    description:
      "Performance analysis and conversion optimization to refine buyer journeys after launch.",
  },
];

export function Scene05Process({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-4xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
            <ShinyText text="Methodology" />
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            How I Work
          </h2>
        </div>

        <div className="flex flex-col">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="flex gap-6 py-5 transition-all duration-500"
              style={{
                borderBottom:
                  i < steps.length - 1 ? "1px solid var(--border-subtle)" : "none",
                opacity: ctx.focused ? 1 : 0.6,
                transitionDelay: ctx.focused ? `${i * 65}ms` : "0ms",
              }}
            >
              <span className="w-10 flex-shrink-0 pt-1 font-mono text-[14px] text-accent/55">
                {step.num}
              </span>
              <div>
                <h3 className="font-display text-[19px] font-medium text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-[16px] leading-[1.7] text-white/40">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

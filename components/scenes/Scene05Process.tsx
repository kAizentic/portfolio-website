"use client";

import type { SceneRenderContext } from "@/types/spatial";

const steps = [
  {
    num: "01",
    title: "Research",
    description:
      "Audience analysis, competitive landscape, and opportunity mapping to ground every decision in reality.",
  },
  {
    num: "02",
    title: "Strategy",
    description:
      "Positioning, narrative architecture, and creative direction aligned with your long-term objectives.",
  },
  {
    num: "03",
    title: "Design",
    description:
      "Visual identity, system building, and iterative prototyping toward a refined final output.",
  },
  {
    num: "04",
    title: "Launch",
    description:
      "Delivery, technical handoff, and post-launch refinement support to ensure a successful rollout.",
  },
];

export function Scene05Process({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-4xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Methodology
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            How We Work
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
              <span className="w-8 flex-shrink-0 pt-0.5 font-mono text-[11px] text-accent/55">
                {step.num}
              </span>
              <div>
                <h3 className="font-display text-[15px] font-medium text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-[1.7] text-white/40">
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

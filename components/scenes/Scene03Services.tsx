"use client";

import { ShinyText } from "@/components/visual-effects/ShinyText";
import { TiltedCard } from "@/components/visual-effects/TiltedCard";
import { StarBorder } from "@/components/visual-effects/StarBorder";
import type { SceneRenderContext } from "@/types/spatial";

const services = [
  {
    label: "Product Marketing",
    description:
      "Positioning, messaging, and content that make complex AI, cloud, and technical products clear to the people who buy them.",
  },
  {
    label: "Go-to-Market Strategy",
    description:
      "Market intelligence, planning, and sales enablement that move buyers from interest to action across the funnel.",
  },
  {
    label: "AI-Enabled Workflows",
    description:
      "Agentic systems that systematize research, competitive analysis, content production, and GTM execution at scale.",
  },
  {
    label: "Digital Experience",
    description:
      "Branded digital experiences, buyer journeys, and conversion optimization built on a decade of ecommerce growth.",
  },
];

export function Scene03Services({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-5xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
            <ShinyText text="Capabilities" />
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            What I Do
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {services.map((service, i) => (
            <TiltedCard key={service.label}>
              <StarBorder className="h-full rounded-2xl" color="var(--accent)" speed="6s" thickness={2}>
                <div
                  className="h-full rounded-2xl border border-white/[0.07] bg-[#0c0c0e] p-8 transition-all duration-500"
                  style={{
                    opacity: ctx.focused ? 1 : 0.65,
                    transitionDelay: ctx.focused ? `${i * 50}ms` : "0ms",
                  }}
                >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full bg-accent"
                    style={{ opacity: ctx.focused ? 1 : 0.5 }}
                  />
                  <h3 className="font-display text-[19px] font-medium text-white">
                    {service.label}
                  </h3>
                </div>
                <p className="text-[16px] leading-[1.7] text-white/40">
                  {service.description}
                </p>
                </div>
              </StarBorder>
            </TiltedCard>
          ))}
        </div>
      </div>
    </div>
  );
}

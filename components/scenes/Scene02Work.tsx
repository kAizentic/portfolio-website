"use client";

import { ShinyText } from "@/components/visual-effects/ShinyText";
import { TiltedCard } from "@/components/visual-effects/TiltedCard";
import type { SceneRenderContext } from "@/types/spatial";

const projects = [
  {
    title: "AI Infrastructure GTM",
    category: "GPU-efficiency positioning · brief in <2 days",
    year: "2024",
  },
  {
    title: "Dell Financial Services",
    category: "+$104M new revenue · 500K customers acquired",
    year: "2023",
  },
  {
    title: "Premium Financing Launches",
    category: "+1,200 bps average financing penetration",
    year: "2022",
  },
  {
    title: "Consumer Ecommerce Merchandising",
    category: "$76M portfolio · +20% YoY holiday margin",
    year: "2020",
  },
];

export function Scene02Work({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
              <ShinyText text="Portfolio" />
            </p>
            <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
              Selected Work
            </h2>
          </div>
          <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-white/25">
            2014 – Present
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <TiltedCard key={project.title}>
              <div
                className="group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05]"
                style={{
                  opacity: ctx.focused ? 1 : 0.7,
                  transition: "opacity 0.5s ease, border-color 0.2s, background-color 0.2s",
                }}
              >
                <div className="mb-4 h-[110px] rounded-xl bg-white/[0.05] transition-colors group-hover:bg-white/[0.08]" />
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="font-display text-[14px] font-medium text-white">
                      {project.title}
                    </h3>
                    <span className="text-[12px] text-white/35">{project.category}</span>
                  </div>
                  <span className="font-mono text-[11px] text-white/20">{project.year}</span>
                </div>
              </div>
            </TiltedCard>
          ))}
        </div>
      </div>
    </div>
  );
}

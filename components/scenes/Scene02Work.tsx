"use client";

import type { SceneRenderContext } from "@/types/spatial";

const projects = [
  { title: "Apex Rebrand", category: "Brand Identity", year: "2025" },
  { title: "Lumina App", category: "Digital Product", year: "2024" },
  { title: "Dusk Editorial", category: "Art Direction", year: "2024" },
  { title: "Strata Platform", category: "Web Experience", year: "2025" },
];

export function Scene02Work({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
              Portfolio
            </p>
            <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
              Selected Work
            </h2>
          </div>
          <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-white/25">
            04 Projects
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.title}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05]"
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
          ))}
        </div>
      </div>
    </div>
  );
}

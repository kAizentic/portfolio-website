"use client";

import { CountUp } from "@/components/visual-effects/CountUp";
import { ShinyText } from "@/components/visual-effects/ShinyText";
import type { SceneRenderContext } from "@/types/spatial";

const stats = [
  { value: 12, suffix: "+", label: "Years" },
  { value: 180, prefix: "$", suffix: "M+", label: "Revenue Driven" },
  { value: 500, suffix: "K", label: "Customers Acquired" },
];

export function Scene04About({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-5xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
            <ShinyText text="Profile" />
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            About Me
          </h2>
        </div>

        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="h-[180px] w-full flex-shrink-0 rounded-2xl bg-white/[0.05] sm:h-[200px] sm:w-[180px]" />
          <div
            className="flex flex-col gap-4 transition-all duration-500"
            style={{ opacity: ctx.focused ? 1 : 0.7 }}
          >
            <p className="text-[15px] leading-[1.78] text-white/55">
              I&apos;m an AI product marketing consultant based in Austin, Texas,
              helping B2B technology companies turn complex products into clear
              positioning, sharper go-to-market, and digital experiences that
              convert.
            </p>
            <p className="text-[14px] leading-[1.75] text-white/38">
              Over the past decade I&apos;ve driven growth across Dell&apos;s
              consumer and financial-services portfolios, led agency delivery for
              enterprise clients, and now build AI-enabled marketing workflows for
              Fortune 100 cloud and infrastructure products.
            </p>
          </div>
        </div>

        <div
          className="mt-8 flex gap-10 border-t pt-6 transition-all duration-500"
          style={{
            borderColor: "var(--border-subtle)",
            opacity: ctx.focused ? 1 : 0.6,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <span className="font-display text-[34px] font-semibold text-accent">
                {stat.prefix}
                <CountUp to={stat.value} startWhen={ctx.focused} separator="," />
                {stat.suffix}
              </span>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "motion/react";

import { CountUp } from "@/components/visual-effects/CountUp";
import { GlareHover } from "@/components/visual-effects/GlareHover";
import { ShinyText } from "@/components/visual-effects/ShinyText";
import type { SceneRenderContext } from "@/types/spatial";

const stats = [
  { value: 12, suffix: "+", label: "Years" },
  { value: 180, prefix: "$", suffix: "M+", label: "Revenue Driven" },
  { value: 500, suffix: "K", label: "Customers Acquired" },
];

export function Scene04About({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  const flow = ctx.layout === "flow";
  const focused = flow || ctx.focused;
  return (
    <div
      className={
        flow
          ? "relative w-full py-20"
          : "absolute inset-0 flex flex-col justify-center"
      }
    >
      <div className="mx-auto w-full max-w-5xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
            <ShinyText text="Profile" />
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-ink">
            About Me
          </h2>
        </div>

        <div className="flex flex-col gap-8 sm:flex-row">
          <GlareHover
            glareOpacity={0.4}
            glareSize={220}
            className="h-[300px] w-[240px] flex-shrink-0 rounded-2xl sm:h-[280px] sm:w-[240px]"
          >
            <div
              role="img"
              aria-label="Michael Ryan McConnell"
              className="absolute inset-0 bg-ink/[0.05] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/mrm-portrait.png)" }}
            />
          </GlareHover>
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: focused ? 1 : 0, y: focused ? 0 : 8 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <p className="text-[19px] leading-[1.75] text-ink/55">
              I am an AI product marketing consultant based in Austin, Texas,
              helping B2B technology companies turn complex products into clear
              positioning, sharper go-to-market, and digital experiences that
              convert.
            </p>
            <p className="text-[17px] leading-[1.72] text-ink/38">
              Over the past decade I&apos;ve driven growth across Dell&apos;s
              consumer and financial-services portfolios, led agency delivery for
              enterprise clients, and now build AI-enabled marketing workflows.
            </p>
          </motion.div>
        </div>

        <div
          className="mt-8 flex flex-wrap gap-x-6 gap-y-5 border-t pt-6 transition-all duration-500 sm:gap-10"
          style={{
            borderColor: "var(--border-subtle)",
            opacity: focused ? 1 : 0.6,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <span className="font-display text-[34px] font-semibold text-accent">
                {stat.prefix}
                <CountUp to={stat.value} startWhen={focused} separator="," />
                {stat.suffix}
              </span>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/35">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

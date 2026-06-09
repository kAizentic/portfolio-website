"use client";

import { motion } from "motion/react";

import { LiquidEtherBackground } from "@/components/visual-effects/LiquidEtherBackground";
import { GradientText } from "@/components/visual-effects/GradientText";
import { ShinyText } from "@/components/visual-effects/ShinyText";
import { sceneManifest } from "@/config/scene-manifest";
import type { SceneRenderContext } from "@/types/spatial";

export function Scene01Hero({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  const flow = ctx.layout === "flow";
  const focused = flow || ctx.focused;
  // Derive anchors from the manifest rather than hardcoding indices.
  // `ctx.navigateTo` routes through the rail's closestEquivalentAnchor on
  // desktop and scroll-jumps to the section on the mobile flow page.
  const workIndex =
    sceneManifest.find((s) => s.navLabel === "Work")?.anchorIndex ?? 0;
  const contactIndex =
    sceneManifest.find((s) => s.navLabel === "Contact")?.anchorIndex ?? 0;

  return (
    <div className={flow ? "relative w-full" : "absolute inset-0"}>
      {/* WebGL fluid background is desktop-only; skip the GPU cost on phones. */}
      {!flow && <LiquidEtherBackground />}

      <div
        className={
          flow
            ? "relative z-10 flex min-h-[100svh] flex-col justify-center pb-16 pt-24"
            : "relative z-10 flex h-full flex-col justify-center"
        }
      >
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
          <div
            className="mb-8 flex items-center gap-3 transition-all duration-500"
            style={{ opacity: focused ? 1 : 0.45 }}
          >
            <span className="font-mono text-[22px] uppercase tracking-[0.2em] text-accent">
              <ShinyText text="Michael Ryan McConnell" />
            </span>
          </div>

          <h1
            className="max-w-[19ch] text-balance font-display text-[clamp(36px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.025em] text-white transition-all duration-700"
            style={{
              opacity: focused ? 1 : 0.75,
              transform: focused ? "translateY(0)" : "translateY(8px)",
            }}
          >
            Product Marketing for{" "}
            <GradientText>AI, Cloud &amp; Technical B2B Products</GradientText>
          </h1>

          <motion.div
            className="mt-7 max-w-[520px] space-y-4 text-[16px] leading-[1.7] text-white/55"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: focused ? 1 : 0, y: focused ? 0 : 8 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <p>
              I help B2B technology companies turn complex products into clear
              positioning, sharper go-to-market strategy, and digital
              experiences that move buyers from interest to action.
            </p>
            <p>
              From AI infrastructure and cloud platforms to ecommerce growth and
              sales enablement, I bring together product marketing, customer
              journey strategy, competitive research, and AI-enabled workflow
              design to help teams market technical products with more precision.
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: focused ? 1 : 0, y: focused ? 0 : 8 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
          >
            <button
              type="button"
              onClick={() => ctx.navigateTo?.(workIndex)}
              className="rounded-full bg-accent px-8 py-3.5 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-accent-hover"
              style={{
                boxShadow: focused ? "0 0 36px var(--accent-glow)" : "none",
                transition: "box-shadow 0.7s ease, background-color 0.2s",
              }}
            >
              View Work
            </button>
            <button
              type="button"
              onClick={() => ctx.navigateTo?.(contactIndex)}
              className="rounded-full border border-white/20 px-8 py-3.5 text-[13px] font-medium tracking-wide text-white/55 transition-colors hover:border-white/40 hover:text-white"
            >
              Let&apos;s Talk
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

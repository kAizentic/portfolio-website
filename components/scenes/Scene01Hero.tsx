"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { LiquidEtherBackground } from "@/components/visual-effects/LiquidEtherBackground";
import { GradientText } from "@/components/visual-effects/GradientText";
import { ShinyText } from "@/components/visual-effects/ShinyText";
import { useTheme } from "@/components/theme/theme";
import { sceneManifest } from "@/config/scene-manifest";
import type { SceneRenderContext } from "@/types/spatial";

/**
 * Light-theme hero portrait — the About headshot presented as a photo taped
 * into a sketchbook: paper mat, slight rotation, two tape strips. Dark theme
 * does not render it (the hero keeps its original fluid-background look).
 */
function HeroPortrait({ focused }: { focused: boolean }): React.JSX.Element {
  return (
    <motion.div
      className="relative mx-auto w-[180px] shrink-0 rotate-2 sm:w-[220px] lg:mx-0 lg:w-[300px]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: focused ? 1 : 0.5, y: focused ? 0 : 10 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
    >
      <div className="bg-modal p-3 pb-9 shadow-[0_18px_40px_rgba(33,28,18,0.18)] ring-1 ring-ink/15">
        <Image
          src="/mrm-portrait.png"
          alt="Michael Ryan McConnell"
          width={600}
          height={750}
          priority
          className="block aspect-[4/5] w-full object-cover"
        />
        <span className="mt-3 block text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">
          Austin, TX
        </span>
      </div>
      {/* Tape strips */}
      <span
        aria-hidden
        className="absolute -top-2.5 left-6 h-5 w-16 -rotate-6 bg-ink/10 ring-1 ring-ink/10"
      />
      <span
        aria-hidden
        className="absolute -bottom-2 right-7 h-5 w-14 rotate-3 bg-ink/10 ring-1 ring-ink/10"
      />
    </motion.div>
  );
}

export function Scene01Hero({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  const flow = ctx.layout === "flow";
  const focused = flow || ctx.focused;
  const light = useTheme() === "light";
  // Derive anchors from the manifest rather than hardcoding indices.
  // `ctx.navigateTo` routes through the rail's closestEquivalentAnchor on
  // desktop and scroll-jumps to the section on the mobile flow page.
  const workIndex =
    sceneManifest.find((s) => s.navLabel === "Work")?.anchorIndex ?? 0;
  const contactIndex =
    sceneManifest.find((s) => s.navLabel === "Contact")?.anchorIndex ?? 0;

  return (
    <div className={flow ? "relative w-full" : "absolute inset-0"}>
      {/* WebGL fluid background is desktop-only and dark-theme-only; the
          light theme shows the site-wide pencil-sketch field instead. */}
      {!flow && !light && <LiquidEtherBackground />}

      <div
        className={
          flow
            ? "relative z-10 flex min-h-[100svh] flex-col justify-center pb-16 pt-24"
            : "relative z-10 flex h-full flex-col justify-center"
        }
      >
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
          <div
            className={
              light
                ? "flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16"
                : ""
            }
          >
            <div className="min-w-0 flex-1">
              <div
                className="mb-8 flex items-center gap-3 transition-all duration-500"
                style={{ opacity: focused ? 1 : 0.45 }}
              >
                <span className="font-mono text-[22px] uppercase tracking-[0.2em] text-accent">
                  <ShinyText text="Michael Ryan McConnell" />
                </span>
              </div>

              <h1
                className="max-w-[19ch] text-balance font-display text-[clamp(36px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.025em] text-ink transition-all duration-700"
                style={{
                  opacity: focused ? 1 : 0.75,
                  transform: focused ? "translateY(0)" : "translateY(8px)",
                }}
              >
                Product Marketing for{" "}
                <GradientText>AI, Cloud &amp; Technical B2B Products</GradientText>
              </h1>

              <motion.div
                className="mt-7 max-w-[520px] space-y-4 text-[16px] leading-[1.7] text-ink/55"
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
                  className="rounded-full bg-accent px-8 py-3.5 text-[13px] font-medium tracking-wide text-on-accent transition-colors hover:bg-accent-hover"
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
                  className="rounded-full border border-ink/20 px-8 py-3.5 text-[13px] font-medium tracking-wide text-ink/55 transition-colors hover:border-ink/40 hover:text-ink"
                >
                  Let&apos;s Talk
                </button>
              </motion.div>
            </div>

            {light && <HeroPortrait focused={focused} />}
          </div>
        </div>
      </div>
    </div>
  );
}

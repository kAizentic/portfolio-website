"use client";

import type { SceneRenderContext } from "@/types/spatial";

export function Scene06Contact({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-3xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Contact
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            Let&apos;s Work Together
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/45">
            Tell us about your project. We&apos;ll be in touch within 24 hours.
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
          style={{ opacity: ctx.focused ? 1 : 0.75, transition: "opacity 0.5s" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name"
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
            />
            <input
              type="email"
              placeholder="Email"
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
            />
          </div>
          <textarea
            placeholder="Tell us about your project..."
            rows={4}
            className="resize-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[12px] text-white/25">
              hello@forma.studio
            </span>
            <button
              type="submit"
              className="rounded-full bg-accent px-7 py-3 text-[13px] font-medium tracking-wide text-white transition-all hover:bg-accent-hover"
              style={{
                boxShadow: ctx.focused ? "0 0 28px var(--accent-glow)" : "none",
                transition: "box-shadow 0.6s ease, background-color 0.2s",
              }}
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

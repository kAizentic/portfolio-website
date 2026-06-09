"use client";

import { useState } from "react";
import Image from "next/image";

import { ShinyText } from "@/components/visual-effects/ShinyText";
import type { SceneRenderContext } from "@/types/spatial";

// Must match the form `name` registered in public/__forms.html for Netlify detection.
const FORM_NAME = "contact";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function Scene06Contact({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const flow = ctx.layout === "flow";
  const focused = flow || ctx.focused;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setStatus("submitting");

    const data = new FormData(e.currentTarget);
    const body = new URLSearchParams(
      data as unknown as Record<string, string>,
    ).toString();

    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error(`Form submission failed: ${res.status}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className={
        flow
          ? "relative w-full py-20"
          : "absolute inset-0 flex flex-col justify-center"
      }
    >
      {/* Faint, desaturated portrait anchored to the left — head & shoulders as a
          subtle background impression, with the right edge softly faded out. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-10%] top-[8%] z-0 h-[92%] w-[80%] opacity-[0.07] grayscale [mask-image:linear-gradient(to_right,black_55%,transparent)] sm:w-1/2 lg:w-[46%]"
      >
        <Image
          src="/web_banner_profile.jpg"
          alt=""
          fill
          priority={false}
          sizes="(max-width: 640px) 75vw, 50vw"
          className="object-cover object-top"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8">
          <p className="mb-3 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
            <ShinyText text="Contact" />
          </p>
          <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-white">
            Let&apos;s Work Together
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/45">
            Tell me about your product or team. I&apos;ll be in touch within 24
            hours.
          </p>
        </div>

        <form
          name={FORM_NAME}
          method="POST"
          data-netlify="true"
          netlify-honeypot="bot-field"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          style={{ opacity: focused ? 1 : 0.75, transition: "opacity 0.5s" }}
        >
          <input type="hidden" name="form-name" value={FORM_NAME} />
          <p hidden>
            <label>
              Don&apos;t fill this out: <input name="bot-field" />
            </label>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              name="name"
              placeholder="Name"
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
            />
          </div>
          <textarea
            name="message"
            placeholder="Tell me about your product or team..."
            rows={4}
            className="resize-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-colors focus:border-accent-border focus:bg-white/[0.06]"
          />
          <div className="flex items-center justify-between gap-4 pt-1">
            <span
              className="font-mono text-[12px]"
              aria-live="polite"
              style={{
                color:
                  status === "error"
                    ? "rgb(248 113 113)"
                    : "rgba(255,255,255,0.45)",
              }}
            >
              {status === "success"
                ? "Thanks — your message is on its way."
                : status === "error"
                  ? "Something went wrong. Please try again."
                  : ""}
            </span>
            <button
              type="submit"
              disabled={status === "submitting" || status === "success"}
              className="rounded-full bg-accent px-7 py-3 text-[13px] font-medium tracking-wide text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                boxShadow: focused ? "0 0 28px var(--accent-glow)" : "none",
                transition: "box-shadow 0.6s ease, background-color 0.2s",
              }}
            >
              {status === "submitting"
                ? "Sending…"
                : status === "success"
                  ? "Sent"
                  : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

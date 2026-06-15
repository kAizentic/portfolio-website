"use client";

/**
 * ConcentricFrameFieldFlow — mobile/flow host for the light-theme framing rings.
 *
 * The phone tree (MobilePortfolio) mounts no Lenis / controller / rebase model —
 * it scrolls natively — so GSAP ScrollTrigger is the right driver here (and the
 * one the design calls for). A single ScrollTrigger scrubbed over the document
 * recomputes, on every scroll tick:
 *   - `convergence`: from the section whose centre is nearest the viewport centre
 *     (rings draw in as a section centres, loosen as it leaves), and
 *   - `hw` / `hh`: the innermost frame size, interpolated between the two sections
 *     bracketing the viewport centre, so the frame hugs each section's content —
 *     keyed by each section's `data-anchor-index`.
 * These are written into MotionValues the shared ConcentricFrameRings reads, so
 * the visual matches the desktop host.
 *
 * Renders only in the light theme. Under reduced motion it holds a static framed
 * state (no ScrollTrigger, no idle breathe), sized to the nearest section.
 */

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionValue } from "motion/react";

import { ConcentricFrameRings } from "@/components/visual-effects/ConcentricFrameRings";
import { useTheme } from "@/components/theme/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  clamp01,
  FRAME_SECTION_SIZES,
  smoothstep,
} from "@/lib/concentric-frame";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const sizeFor = (anchorIndex: number) =>
  FRAME_SECTION_SIZES[anchorIndex] ?? FRAME_SECTION_SIZES[0];

export function ConcentricFrameFieldFlow(): React.JSX.Element | null {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const convergence = useMotionValue(1);
  const hw = useMotionValue(FRAME_SECTION_SIZES[0].hw);
  const hh = useMotionValue(FRAME_SECTION_SIZES[0].hh);

  useGSAP(
    () => {
      if (theme !== "light") return;

      const sections = gsap.utils.toArray<HTMLElement>(
        "main section[data-anchor-index]"
      );
      // Section centres in document space, in anchor-index (DOM) order.
      const centres = () =>
        sections.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            idx: Number(el.dataset.anchorIndex ?? 0),
            center: rect.top + rect.height / 2,
          };
        });

      // Frame size: bracket the viewport centre between two section centres and
      // interpolate their per-section sizes (clamped at the ends).
      const setSize = (mid: number) => {
        const cs = centres();
        if (cs.length === 0) return;
        let a = cs[0];
        let b = cs[0];
        let frac = 0;
        if (mid <= cs[0].center) {
          a = b = cs[0];
        } else if (mid >= cs[cs.length - 1].center) {
          a = b = cs[cs.length - 1];
        } else {
          for (let i = 0; i < cs.length - 1; i++) {
            if (mid >= cs[i].center && mid <= cs[i + 1].center) {
              a = cs[i];
              b = cs[i + 1];
              frac =
                b.center > a.center
                  ? clamp01((mid - a.center) / (b.center - a.center))
                  : 0;
              break;
            }
          }
        }
        const sa = sizeFor(a.idx);
        const sb = sizeFor(b.idx);
        hw.set(sa.hw + (sb.hw - sa.hw) * frac);
        hh.set(sa.hh + (sb.hh - sa.hh) * frac);
      };

      if (reducedMotion) {
        // Static: frame the section nearest at mount, no roll, no ScrollTrigger.
        convergence.set(1);
        setSize(window.innerHeight / 2);
        return;
      }

      const update = () => {
        const mid = window.innerHeight / 2;
        let nearest = Infinity;
        for (const el of sections) {
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          nearest = Math.min(nearest, Math.abs(center - mid));
        }
        // 1 when a section is centred, 0 once it is half a viewport away.
        convergence.set(
          Number.isFinite(nearest)
            ? smoothstep(1 - clamp01(nearest / (window.innerHeight * 0.5)))
            : 1
        );
        setSize(mid);
      };

      const trigger = ScrollTrigger.create({
        trigger: document.documentElement,
        start: 0,
        end: () => document.documentElement.scrollHeight,
        scrub: true,
        onUpdate: update,
        onRefresh: update,
      });
      update();

      return () => trigger.kill();
    },
    { dependencies: [theme, reducedMotion] }
  );

  if (theme !== "light") return null;

  return (
    <ConcentricFrameRings
      convergence={convergence}
      hw={hw}
      hh={hh}
      drift={!reducedMotion}
    />
  );
}

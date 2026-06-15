"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";

import { WorkCardThumb } from "@/components/scenes/WorkCardArt";

export interface WorkCaseStudy {
  title: string;
  category: string;
  year: string;
  art: string;
  summary: string;
  /** Optional screenshot used as the thumbnail/banner in place of motif art. */
  image?: string;
}

/**
 * Case-study detail modal for a Selected Work card. Renders the card's
 * generative art as a banner, then the outcome metric and a brief narrative.
 * While open it pauses the Lenis rail so the camera does not drift behind the
 * overlay; Esc and backdrop click both dismiss.
 */
export function WorkCaseStudyModal({
  project,
  onClose,
}: {
  project: WorkCaseStudy | null;
  onClose: () => void;
}): React.JSX.Element {
  const lenis = useLenis();

  useEffect(() => {
    if (!project) return;
    lenis?.stop();
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [project, lenis, onClose]);

  // Portal to <body> so the fixed overlay escapes the scene's transformed
  // ancestors (SceneFrame applies scale/translateZ, which would otherwise
  // become the containing block for position: fixed).
  if (typeof document === "undefined") return <></>;

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} case study`}
        >
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-ink/[0.1] bg-modal shadow-2xl"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close case study"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-chrome/40 text-ink/60 transition-all duration-200 hover:bg-chrome/60 hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>

            <div className="relative h-[150px] w-full">
              <WorkCardThumb motif={project.art} image={project.image} title={project.title} />
            </div>

            <div className="p-7">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {project.title}
                </h3>
                <span className="mt-1 shrink-0 font-mono text-[12px] text-ink/30">
                  {project.year}
                </span>
              </div>
              <p className="mb-4 font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
                {project.category}
              </p>
              <p className="text-[15px] leading-[1.75] text-ink/55">{project.summary}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

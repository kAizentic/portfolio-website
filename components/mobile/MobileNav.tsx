"use client";

/**
 * MobileNav — sticky header for the continuous mobile page. A compact bar with
 * the name and résumé/GitHub links, plus a horizontally scrollable strip of
 * section links that scroll-jump to each encounter section. This is the
 * touch-friendly counterpart to the desktop gooey SceneNav (which is
 * pointer-oriented and stays desktop-only).
 */

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { SceneManifestEntry } from "@/types/spatial";

const RESUME_HREF = "/reference/Michael_Ryan_McConnell_Resume.pdf";
const GITHUB_HREF = "https://github.com/kAizentic";

export function MobileNav({
  scenes,
  onNavigate,
}: {
  scenes: SceneManifestEntry[];
  onNavigate: (anchorIndex: number) => void;
}): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-chrome/70 backdrop-blur-md">
      <div className="flex items-center justify-between px-5 py-3">
        <button
          type="button"
          onClick={() => onNavigate(0)}
          className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent"
        >
          MRM
        </button>

        <div className="flex items-center gap-5">
          <a
            href={GITHUB_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile (opens in a new tab)"
            className="text-ink/55 transition-colors hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
          <a
            href={RESUME_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55 transition-colors hover:text-ink"
          >
            Résumé
          </a>
          <ThemeToggle className="h-7 w-7" />
        </div>
      </div>

      <nav
        aria-label="Sections"
        className="flex gap-5 overflow-x-auto px-5 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {scenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onNavigate(scene.anchorIndex)}
            className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-ink/45 transition-colors hover:text-ink"
          >
            {scene.navLabel}
          </button>
        ))}
      </nav>
    </header>
  );
}

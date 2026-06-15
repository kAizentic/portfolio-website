"use client";

/**
 * SceneNav — React Bits "Gooey Nav" wired to the rail camera. The active item
 * is driven by `focusedAnchorIndex` (not click state), so the gooey pill tracks
 * whichever scene the camera is actually parked on, including scroll-driven
 * focus changes. Clicking a label initiates accelerated rail travel via
 * `actions.travelTo`; the controller routes to the closest equivalent anchor on
 * the looped rail. The particle burst fires whenever the focused scene changes.
 */

import { useEffect, useRef } from "react";

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/theme";
import { Folder } from "@/components/visual-effects/Folder";

const ANIMATION_TIME = 600;
const PARTICLE_COUNT = 15;
const PARTICLE_DISTANCES: [number, number] = [90, 10];
const PARTICLE_R = 100;
const TIME_VARIANCE = 300;
const COLORS = [1, 2, 3, 1, 2, 3, 1, 4];

function noise(n = 1): number {
  return n / 2 - Math.random() * n;
}

function getXY(
  distance: number,
  pointIndex: number,
  totalPoints: number,
): [number, number] {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
}

interface Particle {
  start: [number, number];
  end: [number, number];
  time: number;
  scale: number;
  color: number;
  rotate: number;
}

function createParticle(
  i: number,
  t: number,
  d: [number, number],
  r: number,
): Particle {
  const rotate = noise(r / 10);
  return {
    start: getXY(d[0], PARTICLE_COUNT - i, PARTICLE_COUNT),
    end: getXY(d[1] + noise(7), PARTICLE_COUNT - i, PARTICLE_COUNT),
    time: t,
    scale: 1 + noise(0.2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
  };
}

function makeParticles(element: HTMLElement): void {
  const d = PARTICLE_DISTANCES;
  const r = PARTICLE_R;
  const bubbleTime = ANIMATION_TIME * 2 + TIME_VARIANCE;
  element.style.setProperty("--time", `${bubbleTime}ms`);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = ANIMATION_TIME * 2 + noise(TIME_VARIANCE * 2);
    const p = createParticle(i, t, d, r);
    element.classList.remove("active");

    setTimeout(() => {
      const particle = document.createElement("span");
      const point = document.createElement("span");
      particle.classList.add("particle");
      particle.style.setProperty("--start-x", `${p.start[0]}px`);
      particle.style.setProperty("--start-y", `${p.start[1]}px`);
      particle.style.setProperty("--end-x", `${p.end[0]}px`);
      particle.style.setProperty("--end-y", `${p.end[1]}px`);
      particle.style.setProperty("--time", `${p.time}ms`);
      particle.style.setProperty("--scale", `${p.scale}`);
      particle.style.setProperty("--color", `var(--color-${p.color}, white)`);
      particle.style.setProperty("--rotate", `${p.rotate}deg`);

      point.classList.add("point");
      particle.appendChild(point);
      element.appendChild(particle);
      requestAnimationFrame(() => element.classList.add("active"));
      setTimeout(() => {
        try {
          element.removeChild(particle);
        } catch {
          // Particle may already have been cleared on a rapid focus change.
        }
      }, t);
    }, 30);
  }
}

function updateEffectPosition(
  container: HTMLElement,
  filter: HTMLElement,
  text: HTMLElement,
  element: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect();
  const pos = element.getBoundingClientRect();
  const styles = {
    left: `${pos.x - containerRect.x}px`,
    top: `${pos.y - containerRect.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`,
  };
  Object.assign(filter.style, styles);
  Object.assign(text.style, styles);
  text.innerText = element.innerText;
}

export function SceneNav(): React.JSX.Element | null {
  const {
    config,
    actions,
    state: { initialized, focusedAnchorIndex, navigationState },
  } = useSpatialController();

  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const prevIndexRef = useRef<number>(-1);

  const scenes = config.scenes;
  const activeIndex = Math.max(
    0,
    scenes.findIndex((s) => s.anchorIndex === focusedAnchorIndex),
  );

  const travelLocked =
    navigationState === "menu" || navigationState === "keyboard";

  // Position the gooey pill over the active item and, when the active item
  // actually changes (scroll- or click-driven), replay the text + particle
  // burst. Re-runs once `initialized` flips so the refs are mounted.
  useEffect(() => {
    if (!initialized) return;
    const container = containerRef.current;
    const list = navRef.current;
    const filter = filterRef.current;
    const text = textRef.current;
    if (!container || !list || !filter || !text) return;

    const activeLi = list.querySelectorAll("li")[activeIndex] as
      | HTMLElement
      | undefined;
    if (activeLi) {
      updateEffectPosition(container, filter, text, activeLi);

      const changed =
        prevIndexRef.current !== -1 && prevIndexRef.current !== activeIndex;
      if (changed) {
        text.classList.remove("active");
        void text.offsetWidth;
        text.classList.add("active");
        filter.querySelectorAll(".particle").forEach((p) => p.remove());
        makeParticles(filter);
      } else {
        text.classList.add("active");
      }
    }
    prevIndexRef.current = activeIndex;

    const resizeObserver = new ResizeObserver(() => {
      const li = navRef.current?.querySelectorAll("li")[activeIndex] as
        | HTMLElement
        | undefined;
      if (li && containerRef.current && filterRef.current && textRef.current) {
        updateEffectPosition(
          containerRef.current,
          filterRef.current,
          textRef.current,
          li,
        );
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [activeIndex, initialized]);

  if (!initialized) return null;

  return (
    <nav
      data-testid="scene-nav"
      aria-label="Encounter anchor index"
      className="fixed inset-x-0 top-0 z-30 flex justify-center border-b border-ink/10 bg-chrome/55 py-8 backdrop-blur-md"
    >
      <div
        ref={containerRef}
        className="gooey-nav-container font-mono text-[11px] tracking-[0.12em]"
      >
        <ul ref={navRef}>
          {scenes.map((scene, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={scene.id} className={isActive ? "active" : ""}>
                <button
                  type="button"
                  data-testid={`scene-nav-${String(scene.anchorIndex + 1).padStart(2, "0")}`}
                  data-anchor-index={scene.anchorIndex}
                  data-focused={isActive ? "true" : "false"}
                  aria-current={isActive ? "true" : undefined}
                  disabled={travelLocked}
                  onClick={() => actions.travelTo(scene.anchorIndex)}
                  className="disabled:opacity-50"
                >
                  {scene.navLabel}
                </button>
              </li>
            );
          })}
        </ul>
        <span className="effect filter" ref={filterRef} />
        <span className="effect text" ref={textRef} />
      </div>

      {/* GitHub + résumé folder, pinned to the right of the centered nav. */}
      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 items-center gap-7 sm:flex">
        <a
          href="https://github.com/kAizentic"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub profile (opens in a new tab)"
          className="text-ink/55 transition-colors hover:text-ink"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>

        <a
          href="/reference/Michael_Ryan_McConnell_Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View résumé (PDF, opens in a new tab)"
          className="group flex items-center gap-2.5"
        >
          <Folder color={theme === "light" ? "#5C6C82" : "#7C3AED"} size={0.4} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55 transition-colors group-hover:text-ink">
            Resume
          </span>
        </a>

        <ThemeToggle />
      </div>

      {/*
       * Alpha-channel goo filter: sharpens the blurred shapes' alpha to merge
       * them into metaballs while preserving their accent color (a CSS
       * contrast() filter would crush the violet to black).
       */}
      <svg aria-hidden className="absolute h-0 w-0" focusable="false">
        <defs>
          <filter id="gooey-nav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </nav>
  );
}

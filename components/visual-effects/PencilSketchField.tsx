"use client";

/**
 * PencilSketchField — light-theme background: a field of small isometric,
 * pencil-drawn doodles (cubes, zigzags, dot clusters) scattered across the
 * aged paper, in matte primary blue / red / green.
 *
 * Hand-drawn motion comes from two layers:
 *  1. "Boiling lines" — a shared feTurbulence displacement filter whose seed
 *     is cycled a few times per second, re-jittering every stroke the way
 *     pencil frames boil in traditional animation.
 *  2. Slow per-doodle drift — each shape floats a few pixels on its own cycle
 *     (`.pencil-doodle` keyframes in globals.css).
 *
 * Renders only when the light theme is active; static (no boil, no drift)
 * under prefers-reduced-motion. Camera-fixed, pointer-events: none.
 */

import { useEffect, useMemo, useRef } from "react";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/components/theme/theme";

// Matte, sedated primaries — graphite-muted so they sit into the paper.
const PENCIL_BLUE = "#5b7a9e";
const PENCIL_RED = "#a85b4c";
const PENCIL_GREEN = "#71896b";
const COLORS = [PENCIL_BLUE, PENCIL_RED, PENCIL_GREEN] as const;

const BOIL_INTERVAL_MS = 220;

/** Deterministic PRNG so the field is identical every mount. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DoodleSpec {
  kind: "cube" | "zigzag" | "dots";
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  rotate: number;
  driftX: number;
  driftY: number;
  driftR: number;
  driftDur: number;
  driftDelay: number;
}

function buildField(): DoodleSpec[] {
  const rand = mulberry32(20260612);
  const kinds: DoodleSpec["kind"][] = ["cube", "zigzag", "dots"];
  const specs: DoodleSpec[] = [];
  // Loose grid jittered into scatter — keeps doodles spread without clumps.
  const cols = 7;
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.22) continue; // leave gaps so it reads hand-scattered
      specs.push({
        kind: kinds[Math.floor(rand() * kinds.length)],
        x: ((c + 0.15 + rand() * 0.7) / cols) * 1440,
        y: ((r + 0.15 + rand() * 0.7) / rows) * 900,
        size: 14 + rand() * 22,
        color: COLORS[Math.floor(rand() * COLORS.length)],
        opacity: 0.32 + rand() * 0.25,
        rotate: -14 + rand() * 28,
        driftX: -6 + rand() * 12,
        driftY: -8 + rand() * 16,
        driftR: -2.5 + rand() * 5,
        driftDur: 8 + rand() * 9,
        driftDelay: -rand() * 12,
      });
    }
  }
  return specs;
}

/** Isometric cube: top diamond + two visible faces, one face shaded. */
function IsoCube({ s, color }: { s: number; color: string }): React.JSX.Element {
  const w = s; // half-width of the iso diamond
  const h = s * 0.5; // half-height (2:1 isometric)
  const d = s * 0.9; // body depth
  return (
    <g stroke={color} strokeWidth={1.3} fill="none">
      {/* top face */}
      <polygon points={`0,${-h} ${w},0 0,${h} ${-w},0`} />
      {/* left face (shaded matte) */}
      <polygon
        points={`${-w},0 0,${h} 0,${h + d} ${-w},${d}`}
        fill={color}
        fillOpacity={0.16}
      />
      {/* right face */}
      <polygon points={`${w},0 0,${h} 0,${h + d} ${w},${d}`} />
    </g>
  );
}

/** Little zigzag stroke, like a pencil-scribbled "zzz". */
function Zigzag({ s, color }: { s: number; color: string }): React.JSX.Element {
  const step = s * 0.5;
  const pts: string[] = [];
  for (let i = 0; i <= 5; i++) {
    pts.push(`${i * step},${i % 2 === 0 ? 0 : step * 0.9}`);
  }
  return (
    <polyline
      points={pts.join(" ")}
      stroke={color}
      strokeWidth={1.4}
      fill="none"
    />
  );
}

/** A loose triangular cluster of pencil dots. */
function Dots({ s, color }: { s: number; color: string }): React.JSX.Element {
  const r = Math.max(1.4, s * 0.09);
  return (
    <g fill={color} fillOpacity={0.55} stroke="none">
      <circle cx={0} cy={0} r={r} />
      <circle cx={s * 0.55} cy={s * 0.28} r={r * 0.85} />
      <circle cx={s * 0.18} cy={s * 0.62} r={r * 0.7} />
    </g>
  );
}

function Doodle({ spec }: { spec: DoodleSpec }): React.JSX.Element {
  const style = {
    "--drift-x": `${spec.driftX}px`,
    "--drift-y": `${spec.driftY}px`,
    "--drift-r": `${spec.driftR}deg`,
    "--drift-dur": `${spec.driftDur}s`,
    "--drift-delay": `${spec.driftDelay}s`,
  } as React.CSSProperties;

  // Static placement lives on the outer group's `transform` attribute; the
  // drift animation lives on an inner group. They must stay separate: a CSS
  // `transform` (the pencil-drift keyframes) overrides the SVG `transform`
  // presentation attribute, so animating the same node would wipe out each
  // doodle's translate/rotate and collapse the whole field onto the origin.
  return (
    <g
      transform={`translate(${spec.x} ${spec.y}) rotate(${spec.rotate})`}
      opacity={spec.opacity}
    >
      <g className="pencil-doodle" style={style}>
        {spec.kind === "cube" && <IsoCube s={spec.size} color={spec.color} />}
        {spec.kind === "zigzag" && <Zigzag s={spec.size} color={spec.color} />}
        {spec.kind === "dots" && <Dots s={spec.size} color={spec.color} />}
      </g>
    </g>
  );
}

export function PencilSketchField(): React.JSX.Element | null {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const doodles = useMemo(() => buildField(), []);
  const active = theme === "light";

  // Boil: re-seed the displacement noise a few times per second so every
  // stroke re-jitters like redrawn pencil frames.
  useEffect(() => {
    if (!active || reducedMotion) return;
    let seed = 1;
    const id = window.setInterval(() => {
      seed = (seed % 7) + 1;
      turbulenceRef.current?.setAttribute("seed", String(seed));
    }, BOIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, reducedMotion]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="pencil-sketch-field"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="pencil-boil" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="2"
              seed="1"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" />
          </filter>
        </defs>
        <g filter="url(#pencil-boil)" strokeLinecap="round" strokeLinejoin="round">
          {doodles.map((spec, i) => (
            <Doodle key={i} spec={spec} />
          ))}
        </g>
      </svg>
    </div>
  );
}

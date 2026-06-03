"use client";

import { memo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import dynamic from "next/dynamic";

const Threads = dynamic(() => import("./Threads"), { ssr: false });

// Hoisted so the prop reference is stable across renders — a fresh array
// literal would otherwise re-fire Threads' uniform-update effect every render.
const THREADS_COLOR: [number, number, number] = [0.49, 0.23, 0.93];

function ThreadsBackgroundImpl(): React.JSX.Element | null {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 hidden sm:block"
      aria-hidden="true"
    >
      <Threads
        color={THREADS_COLOR}
        amplitude={0.5}
        distance={0.3}
        enableMouseInteraction={false}
      />
    </div>
  );
}

// memo so unrelated parent re-renders (focus/nav state changes propagated
// through Scene01Hero) do not re-render the WebGL host.
export const ThreadsBackground = memo(ThreadsBackgroundImpl);

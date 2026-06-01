"use client";

/**
 * EncounterLabScrubber — developer surface for previewing the asymmetric
 * depth-passage curve across two adjacent encounters.
 *
 * Stand-alone (no spatial controller, no Lenis, no environment). The
 * simulated travel depth is owned here as a MotionValue and consumed by
 * two `LabEncounterFrame`s:
 *
 *   anchor A at depth 0     (the "current" / outgoing-side encounter)
 *   anchor B at depth +1000 (the "next" / incoming-side encounter)
 *
 * The scrubber sweeps the camera from −sceneGap × 1.5 to +sceneGap × 1.5
 * so the user sees A approaching, docking, and being passed through while
 * B simultaneously approaches and docks. The play-forward button animates
 * the scrubber over 2 × assistedDockDurationSeconds + landingHold.minimum.
 */

import { animate, motion, useMotionValue, useMotionValueEvent } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LabEncounterFrame } from "@/components/lab/LabEncounterFrame";
import { contentPassageTokens } from "@/config/content-passage-tokens";
import { motionTokens } from "@/config/motion-tokens";
import { classifyPhase } from "@/lib/content-passage";

const ANCHOR_A = 0;
const ANCHOR_B = motionTokens.sceneGap;

const MIN_DEPTH = -motionTokens.sceneGap * 1.5;
const MAX_DEPTH = motionTokens.sceneGap * 1.5;

type PairMode = "both" | "a-only" | "b-only";

export function EncounterLabScrubber(): React.JSX.Element {
  const simulatedTravelDepth = useMotionValue<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [pairMode, setPairMode] = useState<PairMode>("both");
  const [scrubValue, setScrubValue] = useState<number>(0);
  const playAnimationRef = useRef<{ stop: () => void } | null>(null);

  const onScrubChange = useCallback(
    (next: number): void => {
      simulatedTravelDepth.set(next);
      setScrubValue(next);
    },
    [simulatedTravelDepth]
  );

  // Telemetry — read both encounter rels into React state at ~30 fps.
  const [relA, setRelA] = useState<number>(ANCHOR_A - 0);
  const [relB, setRelB] = useState<number>(ANCHOR_B - 0);
  useMotionValueEvent(simulatedTravelDepth, "change", (depth) => {
    setRelA(ANCHOR_A - depth);
    setRelB(ANCHOR_B - depth);
  });

  const phaseA = classifyPhase(relA, contentPassageTokens);
  const phaseB = classifyPhase(relB, contentPassageTokens);

  const playForward = useCallback(() => {
    playAnimationRef.current?.stop();
    const durationSeconds =
      motionTokens.manualTravel.assistedDockDurationSeconds * 2 +
      motionTokens.landingHold.minimumHoldSeconds;
    const controls = animate(MIN_DEPTH, MAX_DEPTH, {
      duration: durationSeconds,
      ease: "easeInOut",
      onUpdate: (latest) => {
        simulatedTravelDepth.set(latest);
        setScrubValue(latest);
      },
    });
    playAnimationRef.current = controls;
  }, [simulatedTravelDepth]);

  const resetToDocked = useCallback(() => {
    playAnimationRef.current?.stop();
    onScrubChange(0);
  }, [onScrubChange]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => playAnimationRef.current?.stop();
  }, []);

  /**
   * Test bridge — exposes `window.__lab.setDepth(value)` so Playwright can
   * drive the simulated camera deterministically without round-tripping
   * through React's controlled-input synchronization (which delays the first
   * non-zero set after page mount). Mirrors the `__rail` bridge pattern used
   * by the live spatial controller.
   */
  useEffect(() => {
    type LabBridge = {
      setDepth: (next: number) => void;
      getDepth: () => number;
      setReducedMotion: (next: boolean) => void;
      getReducedMotion: () => boolean;
    };
    const bridge: LabBridge = {
      setDepth: (next: number) => {
        simulatedTravelDepth.set(next);
        setScrubValue(next);
      },
      getDepth: () => simulatedTravelDepth.get(),
      setReducedMotion: (next: boolean) => setReducedMotion(next),
      getReducedMotion: () => reducedMotion,
    };
    (window as unknown as { __lab?: LabBridge }).__lab = bridge;
    return () => {
      delete (window as unknown as { __lab?: LabBridge }).__lab;
    };
  }, [simulatedTravelDepth, reducedMotion]);

  const showA = pairMode !== "b-only";
  const showB = pairMode !== "a-only";

  const lenisOptions = useMemo(
    () => ({
      sceneGap: motionTokens.sceneGap,
      assistedDockDurationSeconds:
        motionTokens.manualTravel.assistedDockDurationSeconds,
    }),
    []
  );

  return (
    <div
      data-testid="encounter-lab"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-pair-mode={pairMode}
      className="relative min-h-dvh w-full overflow-hidden bg-[#050507] text-white"
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          perspective: `${motionTokens.perspective}px`,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {showA && (
            <LabEncounterFrame
              simulatedTravelDepth={simulatedTravelDepth}
              anchorDepth={ANCHOR_A}
              label="01"
              caption="Anchor A — outgoing side once camera passes through."
              reducedMotion={reducedMotion}
              testIdPrefix="a"
            />
          )}
          {showB && (
            <LabEncounterFrame
              simulatedTravelDepth={simulatedTravelDepth}
              anchorDepth={ANCHOR_B}
              label="02"
              caption="Anchor B — incoming as camera approaches dock."
              reducedMotion={reducedMotion}
              testIdPrefix="b"
            />
          )}
        </div>
      </div>

      {/* Scrubber + telemetry HUD */}
      <motion.aside
        data-testid="encounter-lab-controls"
        className="fixed bottom-4 left-4 right-4 z-30 rounded-xl border border-white/15 bg-black/70 p-4 font-mono text-[11px] text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.32em] text-white/55">
            Encounter Choreography Lab
          </span>
          <span className="text-[10px] uppercase tracking-[0.32em] text-white/40">
            sceneGap={lenisOptions.sceneGap} · dockDuration={lenisOptions.assistedDockDurationSeconds}s
          </span>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <label
            htmlFor="lab-scrubber"
            className="text-[10px] uppercase tracking-[0.28em] text-white/55"
          >
            travel depth
          </label>
          <input
            id="lab-scrubber"
            data-testid="encounter-lab-scrubber"
            type="range"
            min={MIN_DEPTH}
            max={MAX_DEPTH}
            step={1}
            value={scrubValue}
            onChange={(e) => onScrubChange(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span
            data-testid="encounter-lab-depth-readout"
            className="w-16 text-right tabular-nums text-white/85"
          >
            {scrubValue.toFixed(0)}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="encounter-lab-play-forward"
            onClick={playForward}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white/90 hover:bg-white/20"
          >
            Play forward
          </button>
          <button
            type="button"
            data-testid="encounter-lab-reset"
            onClick={resetToDocked}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white/90 hover:bg-white/20"
          >
            Reset to dock
          </button>
          <PairToggle pairMode={pairMode} setPairMode={setPairMode} />
          <ReducedMotionToggle
            value={reducedMotion}
            onChange={setReducedMotion}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <div className="text-white/45">anchor A · rel</div>
          <div className="text-right tabular-nums" data-testid="lab-rel-a">
            {relA.toFixed(1)}
          </div>
          <div className="text-white/45">anchor A · phase</div>
          <div className="text-right" data-testid="lab-phase-a">
            {phaseA}
          </div>
          <div className="text-white/45">anchor B · rel</div>
          <div className="text-right tabular-nums" data-testid="lab-rel-b">
            {relB.toFixed(1)}
          </div>
          <div className="text-white/45">anchor B · phase</div>
          <div className="text-right" data-testid="lab-phase-b">
            {phaseB}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

function PairToggle({
  pairMode,
  setPairMode,
}: {
  pairMode: PairMode;
  setPairMode: (m: PairMode) => void;
}): React.JSX.Element {
  const options: Array<{ id: PairMode; label: string }> = [
    { id: "both", label: "Pair" },
    { id: "a-only", label: "A only" },
    { id: "b-only", label: "B only" },
  ];
  return (
    <div className="inline-flex rounded-full border border-white/20 bg-white/5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          data-testid={`encounter-lab-pair-${opt.id}`}
          data-active={pairMode === opt.id ? "true" : "false"}
          onClick={() => setPairMode(opt.id)}
          className={`px-3 py-1 text-[10px] uppercase tracking-[0.26em] ${
            pairMode === opt.id
              ? "bg-white/20 text-white"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ReducedMotionToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-testid="encounter-lab-reduced-motion"
      data-active={value ? "true" : "false"}
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.26em] ${
        value ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      Reduce motion · {value ? "on" : "off"}
    </button>
  );
}

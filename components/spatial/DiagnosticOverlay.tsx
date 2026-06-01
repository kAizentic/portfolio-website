"use client";

/**
 * DiagnosticOverlay — fixed corner rail telemetry. Renders the throttled
 * controller snapshot. Disabled entirely when `config.showDiagnostics` is
 * false (and the controller skips the snapshot publication in that case).
 */

import { useSpatialController } from "@/components/spatial/SpatialControllerContext";
import { nearestSnapAnchorIndex } from "@/lib/depth-math";

const fmt = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

export function DiagnosticOverlay(): React.JSX.Element | null {
  const {
    config,
    loopLength,
    state: {
      initialized,
      focusedAnchorIndex,
      navigationState,
      manualDockPending,
      reducedMotion,
    },
    diagnostic,
  } = useSpatialController();

  if (!initialized) return null;
  if (!config.showDiagnostics) return null;

  const rows: Array<[string, string]> = diagnostic
    ? [
        [
          "camera mode",
          labelForState(
            navigationState,
            diagnostic.departureBufferPx,
            diagnostic.dockedHoldGatesOpen
          ),
        ],
        [
          "current encounter anchor",
          labelOfIndex(focusedAnchorIndex, config.scenes),
        ],
        [
          "last docked encounter",
          labelOfIndex(diagnostic.lastDockedAnchorIndex, config.scenes),
        ],
        ["departure direction", signLabel(diagnostic.departureDirection)],
        ["departure ratio", fmt(diagnostic.departureRatio, 3)],
        [
          "committed docking target",
          diagnostic.committedDockTargetIndex === null
            ? "—"
            : labelOfIndex(
                diagnostic.committedDockTargetIndex,
                config.scenes
              ),
        ],
        [
          "nearest fallback candidate",
          labelOfIndex(
            nearestSnapAnchorIndex(
              diagnostic.travelDepth,
              config.scenes,
              config.motion.sceneGap,
              loopLength
            ),
            config.scenes
          ),
        ],
        ["travel depth", fmt(diagnostic.travelDepth, 1)],
        ["loop-local depth", fmt(diagnostic.wrappedDepth, 1)],
        ["loop revolutions", String(diagnostic.loopCycle)],
        ["render scroll (px)", fmt(diagnostic.renderScrollPx, 0)],
        ["target scroll (px)", fmt(diagnostic.targetScrollPx, 0)],
        ["rail rebase offset", fmt(diagnostic.rebaseOffsetDepth, 1)],
        ["physical cycle", String(diagnostic.physicalCycle)],
        ["direction", signLabel(diagnostic.direction)],
        ["velocity (units/s)", fmt(diagnostic.velocity, 1)],
        ["dock pending", manualDockPending ? "yes" : "no"],
        [
          "hold remaining (s)",
          navigationState === "dockedHold"
            ? fmt(diagnostic.holdRemainingSeconds, 3)
            : "—",
        ],
        [
          "input quiet",
          navigationState === "dockedHold"
            ? diagnostic.inputQuiet
              ? "yes"
              : "no"
            : "—",
        ],
        [
          "departure intent",
          diagnostic.departureIntentDetected ? "detected" : "—",
        ],
        [
          "departure buffer (px)",
          navigationState === "dockedHold"
            ? fmt(diagnostic.departureBufferPx, 0)
            : "—",
        ],
        [
          "departure buffer threshold (px)",
          navigationState === "dockedHold"
            ? fmt(diagnostic.departureBufferThresholdPx, 0)
            : "—",
        ],
        [
          "departure buffer direction",
          navigationState === "dockedHold"
            ? signLabel(diagnostic.departureBufferDirection)
            : "—",
        ],
        [
          "buffer release ready",
          navigationState === "dockedHold"
            ? diagnostic.departureBufferThresholdReached
              ? "yes"
              : "no"
            : "—",
        ],
        [
          "residual input filtered",
          navigationState === "dockedHold"
            ? diagnostic.residualInputFiltered
              ? "yes"
              : "no"
            : "—",
        ],
        ["reduced motion", reducedMotion ? "yes" : "no"],
      ]
    : [];

  return (
    <aside
      data-testid="diagnostic-overlay"
      data-nav-state={navigationState}
      data-focused-anchor={focusedAnchorIndex}
      data-manual-dock-pending={manualDockPending ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-label="Rail telemetry"
      className="pointer-events-none fixed bottom-4 left-4 z-30 max-w-[360px] rounded-xl border border-white/15 bg-black/65 px-4 py-3 font-mono text-[11px] text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.32em] text-white/55">
          Rail telemetry
        </span>
        <span className="text-[10px] uppercase tracking-[0.32em] text-white/40">
          diagnostic
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <FragmentRow key={label} label={label} value={value} />
        ))}
      </dl>
    </aside>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-white/45">{label}</dt>
      <dd
        data-testid={`diagnostic-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
        className="text-right"
      >
        {value}
      </dd>
    </>
  );
}

function labelForState(
  state: string,
  departureBufferPx = 0,
  minimumHoldComplete = false
): string {
  switch (state) {
    case "idle":
      return "parked";
    case "dockedHold":
      if (
        minimumHoldComplete &&
        Math.abs(departureBufferPx) > 0
      ) {
        return "departure resistance";
      }
      return "docked hold";
    case "manual":
      return "free camera";
    case "snapping":
      return "assisted docking";
    case "menu":
      return "rail travel — menu";
    case "keyboard":
      return "rail travel — keyboard";
    default:
      return state;
  }
}

function labelOfIndex(
  index: number,
  scenes: ReadonlyArray<{ navLabel: string }>
): string {
  return scenes[index]?.navLabel ?? "—";
}

function signLabel(d: -1 | 0 | 1): string {
  if (d > 0) return "forward";
  if (d < 0) return "backward";
  return "—";
}

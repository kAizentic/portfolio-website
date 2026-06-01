# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests (pure math: depth-math, config-validation, etc.)
npm run test:e2e     # Playwright suite against next dev on port 3210
npm run test         # Both suites sequentially
```

Run a single Vitest file:
```bash
npx vitest run lib/__tests__/depth-math.test.ts
```

Run a single Playwright spec (server must be running on port 3210):
```bash
npx playwright test e2e/assisted-docking.spec.ts
```

Playwright starts its own `next dev -p 3210` server automatically when none is running. The main dev server on 3000 is separate.

---

## Architecture

### Component tree

```
app/page.tsx
  └─ SpatialViewport          # mounts ReactLenis + provides SpatialConfig
       └─ SpatialControllerProvider   # single source of truth for camera state
            ├─ ScrollSurface          # physical tall div (physicalLoopCopies × loopLengthPx)
            ├─ SceneLayer             # positions SceneFrames in viewport space
            │    └─ SceneFrame ×N     # per-anchor motion shell; derives from travelDepth MV
            ├─ SceneNav               # encounter-index buttons → actions.travelTo()
            ├─ DiagnosticOverlay      # telemetry; reads DiagnosticSnapshot at ~30 fps
            └─ EnvironmentLayer       # atmospheric backdrop / parallax depth cues
```

### Data flow

- **Single MotionValue**: `SpatialControllerProvider` owns one `travelDepth: MotionValue<number>`. Every `SceneFrame` calls `useTransform(travelDepth, …)` to derive its own `opacity`, `scale`, `translateZ`, `filter`, and `pointerEvents`. No React re-render happens per animation frame.
- **High-frequency state in refs**: All per-tick values (`renderScrollPx`, `rebaseOffsetDepth`, `velocity`, etc.) live in a single `refs.current` object. React state (`focusedAnchorIndex`, `navigationState`, `manualDockPending`, `initialized`) is only updated when values change at the interaction boundary.
- **Lenis is the clock**: `useLenis(callback)` subscribes to every Lenis tick. The callback reads `lenisInstance.animatedScroll`, computes `travelDepth`, updates refs, and calls `travelDepth.set(...)`.
- **All programmatic travel routes through `programmaticScrollOptions`** — this sets `lerp: 0` so Lenis's duration+easing path is authoritative. Manual wheel/touch goes through Lenis's own pipeline (lerp = 0.1, no `programmatic: true`).

### Configuration layer

| File | Purpose |
|---|---|
| `config/scene-manifest.ts` | Encounter anchors (id, navLabel, anchorIndex, diagnosticLabel) |
| `config/motion-tokens.ts` | All spacing, falloff curves, timing, and docking parameters |
| `config/spatial-config.tsx` | Composes the above into `SpatialConfig`; sets `renderSceneContent` |
| `lib/config-validation.ts` | Invariant checks asserted at mount |

### Math library (`lib/`)

- `depth-math.ts` — core rail math: `closestEquivalentAnchor`, `wrap`, `computeRebase`, `visualMapping`, `depthToRenderScrollPx`, `assistedDockTargetFromCommitment`
- `landing-hold.ts` — docked-hold gate logic: minimum hold, departure buffer, residual-input filtering
- `content-passage.ts` — passage detection (entering/leaving the focal window)
- `environment-depth.ts` — per-anchor depth values for the environment layer
- `easing.ts` — easing functions used by motion tokens

### Test bridge

`window.__rail` is attached by `SpatialControllerProvider` for Playwright tests only. It exposes `actions`, `state()`, `travelDepth()`, and `jumpToRenderScrollPx(px)` so E2E tests can drive the rail deterministically without simulating many wheel events.

### Next.js version note

This project uses **Next.js 16**, which has breaking changes from earlier versions. Before editing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.
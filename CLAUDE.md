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
app/page.tsx                  # useIsMobile() branch (see "Responsive layout")
  ├─ SpatialViewport          # DESKTOP (≥ md): mounts ReactLenis + provides SpatialConfig
  │    └─ SpatialControllerProvider   # single source of truth for camera state
  │         ├─ ScrollSurface          # physical tall div (physicalLoopCopies × loopLengthPx)
  │         ├─ SceneLayer             # positions SceneFrames in viewport space
  │         │    └─ SceneFrame ×N     # per-anchor motion shell; derives from travelDepth MV
  │         ├─ SceneNav               # encounter-index buttons → actions.travelTo()
  │         ├─ DiagnosticOverlay      # telemetry; reads DiagnosticSnapshot at ~30 fps
  │         └─ EnvironmentLayer       # atmospheric backdrop / parallax depth cues
  └─ MobilePortfolio          # MOBILE (< md): continuous-page layout, no rail
       ├─ MobileNav           # sticky header: section links → scroll-jump
       └─ <section> ×N        # each scene rendered with layout:"flow"
```

### Data flow

- **Single MotionValue**: `SpatialControllerProvider` owns one `travelDepth: MotionValue<number>`. Every `SceneFrame` calls `useTransform(travelDepth, …)` to derive its own `opacity`, `scale`, `translateZ`, `filter`, and `pointerEvents`. No React re-render happens per animation frame.
- **High-frequency state in refs**: All per-tick values (`renderScrollPx`, `rebaseOffsetDepth`, `velocity`, etc.) live in a single `refs.current` object. React state (`focusedAnchorIndex`, `navigationState`, `manualDockPending`, `initialized`) is only updated when values change at the interaction boundary.
- **Lenis is the clock**: `useLenis(callback)` subscribes to every Lenis tick. The callback reads `lenisInstance.animatedScroll`, computes `travelDepth`, updates refs, and calls `travelDepth.set(...)`.
- **All programmatic travel routes through `programmaticScrollOptions`** — this sets `lerp: 0` so Lenis's duration+easing path is authoritative. Manual wheel/touch goes through Lenis's own pipeline (lerp = 0.1, no `programmatic: true`).

### Responsive layout (desktop rail vs. mobile flow)

`app/page.tsx` chooses one of two entirely separate trees from the **same**
`portfolioConfig`, based on `useIsMobile()` (`hooks/useIsMobile.ts`,
`max-width: 767px` — below Tailwind's `md`, i.e. phones only):

- **Desktop (≥ md): `SpatialViewport`** — the rail-camera experience described
  above, completely unchanged.
- **Mobile (< md): `MobilePortfolio`** (`components/mobile/`) — the six scenes
  stacked as normal-flow `<section>`s with native scrolling. **No Lenis, no
  `SpatialControllerProvider`, no rebase model is mounted.** Navigation
  (`MobileNav` links + hero CTAs) scroll-jumps to `#encounter-{anchorIndex}`.

`useIsMobile()` returns `null` for the server render and the first hydration
pass; `page.tsx` shows a neutral backdrop until it resolves, so the heavy rail
is never mounted on a phone (or vice-versa) before the viewport is known.

**How one scene component serves both trees.** `SceneRenderContext` carries a
`layout: "rail" | "flow"` flag (undefined ⇒ rail) and a `navigateTo(anchorIndex)`
callback:

| | `layout: "rail"` (desktop) | `layout: "flow"` (mobile) |
|---|---|---|
| Set by | `SceneFrame` | `MobilePortfolio` |
| Scene root | `absolute inset-0`, centered | `relative w-full`, natural height |
| `focused` gating | from `travelDepth` | forced `true` (always visible) |
| `navigateTo` | `actions.travelTo` (rail travel) | scroll-jump to section |

Each scene reads `const flow = ctx.layout === "flow"` and branches its root
class + `focused`. Flow-only simplifications (per product decision): the hero
drops its WebGL `LiquidEtherBackground`, `Scene02Work` swaps the paginated
carousel for a stacked list, and pointer-tilt (`TiltedCard`) renders flat.
Copy lives once in the scene components — the mobile tree reuses them, it does
not duplicate content. When adding/editing a scene, keep both branches working.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

Graph-first protocol (added — verified by a Phase 0 diagnostic: 6/8 questions correct, 0 hallucinated edges, ~10–35× fewer tokens than reading files):
- **Before editing any symbol, run the blast-radius check:** `python graphify-orient.py blast "<symbol>"` (wraps `graphify affected "<symbol>"` — the graph maintained by the hooks/watcher is undirected, so this returns the impacted *neighborhood* (importers/callers plus callees): a conservative, possibly over-broad "what to check before editing" set, never an under-set. This is the canonical "what might break if I change this" query. At session start, `python graphify-orient.py orient` prints the freshness verdict + god-node/community map.
- **Trust the graph only when it is fresh.** `orient`/`blast` print `GROUND TRUTH` vs `HINT` by comparing `graph.json`'s `built_at_commit` to `git HEAD` (and checking the `needs_update` flag + dirty working tree). On `HINT`, treat graph answers as hints and verify changed files directly. Post-commit and post-checkout hooks auto-rebuild the AST graph; for continuous freshness during active editing run `python -m graphify.watch . --debounce 3` in the background (AST, no LLM, catches uncommitted edits).
- **Know the graph's boundary.** It is authoritative for function/import/call structure (blast radius, traces, consumers). It **under-recalls non-function value bindings** (const/options objects) and **field/property-level data flow** (e.g. "who reads this MotionValue"). An empty `affected` result is NOT proof nothing uses the symbol — fall back to `grep` for those cases.

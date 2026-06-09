<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# spatial-site-template — rail-camera conceptual model

This template is a **rail-mounted camera traversing a continuous looped
spatial environment** that contains anchored content encounter zones. It is
**not** a 3D carousel, a stack of cards moving toward the user, or a
list-with-snap. Preserve this framing in code comments, JSDoc, diagnostic
labels, and documentation. Engineering identifiers stay (`SceneFrame`,
`SceneLayer`, `travelDepth`, `navigationState`); user-facing language uses
the rail-camera vocabulary.

## Desktop rail vs. mobile flow

The rail-camera model and every invariant below describe the **desktop tree**
(`SpatialViewport`, viewport ≥ Tailwind `md`). On phones (`< md`),
`app/page.tsx` mounts a completely separate **`MobilePortfolio`** tree: the
same six scenes stacked as a traditional continuous-scroll page, with **no
Lenis, controller, or rebase model**. The two trees share scene components and
the `portfolioConfig`, not runtime state. A scene renders for whichever tree
asks via `ctx.layout` (`"rail"` | `"flow"`) and navigates via `ctx.navigateTo`
(rail travel on desktop, scroll-jump on mobile) — see the "Responsive layout"
section in `CLAUDE.md` for the full contract. The invariants here constrain the
rail; they do not apply to the flow tree, which mounts none of that machinery.

## Key invariants for future changes

1. **One depth controller.** All four input modes (manual scroll, docking,
   menu rail travel, keyboard rail travel) write to Lenis via `scrollTo`
   and read back the same `travelDepth`. Do not introduce a second source
   of camera position.
2. **Logical vs physical scroll is separate.** `travelDepth = renderScrollPx
   / pxPerDepthUnit + rebaseOffsetDepth`. Do not collapse them.
3. **The user never sees a physical boundary.** The multi-cycle physical
   surface (`physicalLoopCopies` × `loopLengthPx`) with a central safe band
   and silent rebase to the center cycle prevents the user from reaching
   the top or bottom of the document. Programmatic travel calls
   `rebaseToCentralCycleIfNeeded()` first.
4. **No `lenis.infinite: true`.** Looping is provided by our rebase model.
5. **Programmatic scroll uses duration + easing, not lerp.** Every
   `scrollTo` for snap, menu, keyboard, and rebase routes through
   `programmaticScrollOptions(...)` (or `immediateScrollOptions(...)` for
   immediate jumps) which sets `lerp: 0` so duration is authoritative.
6. **Equivalent anchors, not base anchors.** Menu, keyboard, and snap
   targeting all call `closestEquivalentAnchor(travelDepth, baseAnchor, L)`.
   Never bypass it.
7. **Menu and keyboard travel are uncancellable in v1.** Only docking
   (`navigationState === "snapping"`) accepts cancellation via genuine
   user input detected through Lenis `virtual-scroll` events.
8. **`manualDockPending` gates docking initiation.** Docking begins only
   after a real user input cycle ends and the idle delay has elapsed.
9. **Initialization gate.** Scene surfaces, navigation, and overlay are
   hidden until `initialized === true`, which is set inside
   `useLayoutEffect` after the central-cycle rebase.

## Scope ceiling

Until lifted by explicit direction, do not introduce:

- real content (portfolio names, biography, case studies, contact info),
- production typography or imagery,
- final branded visual styling,
- React Three Fiber,
- premium UI components,
- skeleton or production scene modes,
- per-scene theme systems.

The placeholder panels in `components/scenes/ScenePlaceholder.tsx` exist
for measurement; do not embellish them with environmental visuals.

## Visual effects (WebGL backgrounds)

WebGL background effects (e.g. the hero's `LiquidEther`) live in
`components/visual-effects/`. The established pattern, when adding a new
one, is a **raw effect component** plus a **host wrapper** — see
`LiquidEther.jsx` (the three.js fluid renderer, vendored verbatim from
React Bits) and `LiquidEtherBackground.tsx` (the host) as the reference
implementation.

**Rendering scope.** Plain **three.js** or **OGL** / raw GLSL shaders are
permitted (`three` is the current graphics dependency; `ogl` is also
fine). **React Three Fiber is still barred** — see the scope ceiling
above; `LiquidEther` uses three.js directly, not R3F. Most copy-in
effects come from React Bits (reactbits.dev) already shaped as React
components; porting a Shadertoy/CodePen shader means wrapping it the same
way.

**Vendored components.** Large copy-in effects (like `LiquidEther.jsx`)
are kept verbatim as untyped `.jsx` with `"use client"` and a top-level
`/* eslint-disable */` + MIT attribution comment, so the upstream source
stays diff-able. They are excluded from strict typechecking by virtue of
not being `.ts`/`.tsx`. Do the React/Next adaptation (SSR gating, a11y,
memoization) in the `.tsx` host wrapper, never by editing the vendored
file.

**Host wrapper conventions** (all four matter — `ThreadsBackground.tsx`
demonstrates each):

1. **Client-only.** Load the renderer with
   `dynamic(() => import("./Effect"), { ssr: false })` — WebGL needs a
   real canvas and cannot server-render.
2. **Reduced-motion gate.** Call `useReducedMotion()` and return `null`
   when the user prefers reduced motion. Do not render a paused canvas.
3. **Background, not foreground.** Mount as an absolute layer behind
   content: `pointer-events-none absolute inset-0 z-0`, `aria-hidden`,
   and `hidden sm:block` to skip the GPU cost on small screens.
4. **Stable props + memo.** `memo` the wrapper so unrelated parent
   re-renders do not re-init the GL context, and **hoist any
   array/object prop** (e.g. the color tuple) to a module constant — a
   fresh literal each render re-fires the renderer's uniform-update
   effect.

Place the wrapper inside the relevant scene as a background layer (the
hero mounts `<ThreadsBackground />` first in `Scene01Hero.tsx`), never
inside `ScenePlaceholder.tsx`.

Check the source's license before copying (React Bits is MIT); add a
one-line attribution comment at the top of the ported component.

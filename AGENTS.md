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

# spatial-site-template

A reusable Next.js + Tailwind interaction template for a **rail-camera
spatial site**. The viewport is a fixed camera mounted on a continuous,
looped rail. The user's scroll input drives the camera along that rail past
fixed *encounter anchors* in world space. This is **not** a 3D carousel or a
stack of cards moving toward the user; it is a camera traversing an
environment that happens to contain anchored content zones.

This is a prototype that validates **motion mechanics only**. It is not a
portfolio site, it contains no real content, no production typography, no
branded styling, no atmospheric depth-cue layer. A later pass adds those.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- [`lenis`](https://github.com/darkroomengineering/lenis) (`lenis/react`)
  for smoothing of the natural document scroll
- [`motion`](https://motion.dev) (`motion/react`) for DOM transforms via
  `MotionValue` / `useTransform`
- Vitest for pure math tests
- Playwright for the diagnostic interaction suite

## What this template provides

- Six anonymous encounter anchors (`01`–`06`).
- Continuous looped rail with seamless circular wrap via a multi-cycle
  physical scroll surface and a silent rebase offset model.
- One unified depth controller. All four input modes (manual wheel/touch,
  docking after manual movement ends, encounter-index menu travel,
  keyboard travel) write through Lenis and read back the same
  `travelDepth`.
- Atmospheric falloff + parallax depth derived per anchor from its signed
  distance to the camera (`relativeDepth`).
- `pointer-events` gating so only the encounter at the focal plane accepts
  interaction.
- Reduced-motion behavior that pins continuous scale/blur to focus values
  and shortens programmatic rail-travel duration.
- A diagnostic placeholder per anchor and a corner rail-telemetry overlay.
- A visible-but-nonfunctional Standard View affordance.

## What this template does **not** provide (yet)

- Real content of any kind. No project names, no biography, no case
  studies, no contact details.
- Production typography or imagery.
- Final visual language. Placeholder panels exist for measurement only.
- React Three Fiber. The rail-camera atmosphere will be added in a later
  pass.
- Premium UI components.
- Skeleton or production scene modes beyond the placeholder interface.

## Rail-camera glossary

The implementation keeps engineering identifiers (`SceneFrame`,
`SceneLayer`, `travelDepth`, …) but human-readable surfaces speak the
rail-camera language.

| Implementation identifier        | Conceptual name (overlay/comments)              |
| -------------------------------- | ----------------------------------------------- |
| `travelDepth`                    | camera travel depth                             |
| `wrappedDepth`                   | camera position within current loop             |
| `renderScrollPx`                 | rail render coordinate (Lenis animatedScroll)   |
| `targetScrollPx`                 | rail target coordinate (Lenis targetScroll)    |
| `rebaseOffsetDepth`              | rail rebase offset                              |
| `loopCycle`                      | loop revolutions                                |
| `focusedAnchorIndex`             | current encounter anchor                        |
| `nearestAnchorIndex`             | nearest encounter anchor                        |
| `baseAnchorDepth`                | base position of an encounter anchor            |
| `equivalentAnchorDepth`          | nearest equivalent of that anchor on the rail   |
| `relativeDepth`                  | signed distance from camera to anchor           |
| `navigationState: "snapping"`    | docking                                         |
| `navigationState: "menu"`        | rail travel — menu                              |
| `navigationState: "keyboard"`    | rail travel — keyboard                          |
| `navigationState: "manual"`      | free camera                                     |
| `navigationState: "idle"`        | parked at encounter                             |

## Configuration

All spacing, atmospheric curves, parallax depth, and timing tokens live in
`config/motion-tokens.ts`. Encounter anchors live in
`config/scene-manifest.ts`. The default diagnostic configuration is composed
in `config/spatial-config.tsx`.

Configuration invariants enforced at mount (`lib/config-validation.ts`):

- `windowRadius < loopLength / 2`
- `focusEpsilon < sceneGap / 2`
- `translateZAt.focus === 0`
- `physical.physicalLoopCopies >= 5`
- `physical.initialPhysicalCycle > 0`
- `physical.initialPhysicalCycle < physicalLoopCopies - 1`

## Lenis duration vs lerp

Every programmatic rail-travel or docking call routes through
`programmaticScrollOptions` in `components/spatial/SpatialControllerContext.tsx`,
which combines `{ duration, easing }` with an explicit `lerp: 0`. Lenis's
internal `Animate.advance` prefers `duration && easing` over lerp, so the
configured duration governs the animation. Manual wheel/touch still uses
the default instance lerp (0.1) because it goes through Lenis's own
`scrollTo` with `programmatic: false`. Verified against `lenis@1.3.23`.

## Snap

Nearest-anchor only in this build (`snap.mode === "nearest"`,
`snap.directionalBiasEnabled === false`). The directional-bias slot is left
behind a stable function seam (`pickSnapAnchor`) for a later A/B with
mouse and trackpad behavior.

## Initialization

The provider performs the central-cycle rebase + ref priming inside
`useLayoutEffect` before revealing scene surfaces, so the user never sees
the camera at the physical document top.

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run start       # Production server
npm run lint        # ESLint
npm run test:unit   # Vitest unit tests (depth math, invariants)
npm run test:e2e    # Playwright diagnostic interaction suite
npm run test        # Both
```

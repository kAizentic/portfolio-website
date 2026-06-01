/**
 * Anonymous encounter anchors for the rail-camera prototype.
 *
 * These are deliberately content-free placeholders. The diagnostic build
 * uses the navLabel for identification only; meaning is supplied later via
 * an injected `renderSceneContent` for future skeleton/production modes.
 *
 * Anchor positions are derived from `anchorIndex * sceneGap` at runtime —
 * no scene encodes a depth value of its own.
 */

import type { SceneManifestEntry } from "@/types/spatial";

export const sceneManifest: SceneManifestEntry[] = [
  {
    id: "scene-01",
    navLabel: "01",
    anchorIndex: 0,
    diagnosticLabel: "Encounter anchor 01",
  },
  {
    id: "scene-02",
    navLabel: "02",
    anchorIndex: 1,
    diagnosticLabel: "Encounter anchor 02",
  },
  {
    id: "scene-03",
    navLabel: "03",
    anchorIndex: 2,
    diagnosticLabel: "Encounter anchor 03",
  },
  {
    id: "scene-04",
    navLabel: "04",
    anchorIndex: 3,
    diagnosticLabel: "Encounter anchor 04",
  },
  {
    id: "scene-05",
    navLabel: "05",
    anchorIndex: 4,
    diagnosticLabel: "Encounter anchor 05",
  },
  {
    id: "scene-06",
    navLabel: "06",
    anchorIndex: 5,
    diagnosticLabel: "Encounter anchor 06",
  },
];

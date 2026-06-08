"use client";

/*
 * React Bits "Folder" (MIT — reactbits.dev). Ported to a typed component; the
 * styling lives in `.folder` / `.paper` rules in globals.css. Stateless: the
 * lid opens and the papers peek on hover via CSS, so the whole element can be
 * wrapped in a link. Visual scaling is applied on a middle layer so it does not
 * clobber the `.folder` element's own hover transforms, and the outer box is
 * sized to the scaled footprint so it sits tightly in layout.
 */

const BACK_W = 100;
const BACK_H = 80;

/** Darken a hex color toward black by `percent` (0–1). */
function darken(hex: string, percent: number): string {
  let color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

interface FolderProps {
  /** Folder lid color. */
  color?: string;
  /** Uniform scale factor (1 = the native 100×80 size). */
  size?: number;
  className?: string;
}

export function Folder({
  color = "#7C3AED",
  size = 1,
  className = "",
}: FolderProps): React.JSX.Element {
  const vars = {
    "--folder-color": color,
    "--folder-back-color": darken(color, 0.08),
    "--paper-1": darken("#ffffff", 0.1),
    "--paper-2": darken("#ffffff", 0.05),
    "--paper-3": "#ffffff",
  } as React.CSSProperties;

  return (
    <div
      className={className}
      style={{ width: `${BACK_W * size}px`, height: `${BACK_H * size}px` }}
    >
      <div style={{ transform: `scale(${size})`, transformOrigin: "top left" }}>
        <div className="folder" style={vars}>
          <div className="folder__back">
            <div className="paper paper-1" />
            <div className="paper paper-2" />
            <div className="paper paper-3" />
            <div className="folder__front" />
            <div className="folder__front right" />
          </div>
        </div>
      </div>
    </div>
  );
}

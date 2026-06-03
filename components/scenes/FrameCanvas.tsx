import type { ReactNode } from "react";

/**
 * Positions content anywhere within a SceneFrame's full-viewport space.
 *
 * The outer layer fills the SceneFrame (`absolute inset-0`) so that every
 * frame is effectively full-screen. The inner layer places the child content
 * at the specified coordinates. Defaults to center (50% / 50% with -50%
 * offsets).
 *
 * Usage in portfolio-config.tsx:
 *   <FrameCanvas left="12%" top="50%">
 *     <Scene02Work ctx={ctx} />
 *   </FrameCanvas>
 *
 * To anchor from the right or bottom, omit `left`/`top` and use `right`/`bottom`:
 *   <FrameCanvas right="8%" bottom="20%" translateX="0%" translateY="0%">
 *     ...
 *   </FrameCanvas>
 */
export function FrameCanvas({
  children,
  left,
  top,
  right,
  bottom,
  translateX = "-50%",
  translateY = "-50%",
}: {
  children: ReactNode;
  /** CSS left value. Omit when using `right`. Default "50%". */
  left?: string;
  /** CSS top value. Omit when using `bottom`. Default "50%". */
  top?: string;
  /** CSS right value. When provided, overrides left. */
  right?: string;
  /** CSS bottom value. When provided, overrides top. */
  bottom?: string;
  /**
   * Horizontal offset applied via transform. Default "-50%" centers the
   * content on the `left` anchor point. Set to "0%" when anchoring to right.
   */
  translateX?: string;
  /**
   * Vertical offset applied via transform. Default "-50%" centers the
   * content on the `top` anchor point. Set to "0%" when anchoring to bottom.
   */
  translateY?: string;
}): React.JSX.Element {
  const resolvedLeft = right !== undefined ? undefined : (left ?? "50%");
  const resolvedTop = bottom !== undefined ? undefined : (top ?? "50%");

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="pointer-events-auto absolute"
        style={{
          left: resolvedLeft,
          top: resolvedTop,
          right,
          bottom,
          transform: `translateX(${translateX}) translateY(${translateY})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

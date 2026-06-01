import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout for the spatial site template (diagnostic prototype).
 *
 * Intentionally minimal: no production typography, no branded metadata.
 * The page body is owned by SpatialViewport which wraps its own
 * <ReactLenis root>. We keep `body` overflow visible so Lenis can drive
 * the natural document scroll.
 */
export const metadata: Metadata = {
  title: "Spatial Site Template — Diagnostic Prototype",
  description:
    "Rail-camera spatial interaction prototype. Diagnostic mode only; no portfolio content.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}

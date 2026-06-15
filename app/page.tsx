"use client";

import { MobilePortfolio } from "@/components/mobile/MobilePortfolio";
import { SpatialViewport } from "@/components/spatial/SpatialViewport";
import { portfolioConfig } from "@/config/portfolio-config";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function Page() {
  const isMobile = useIsMobile();

  // `null` during SSR and the first hydration render — show a neutral backdrop
  // so we never mount the desktop rail on a phone (or vice versa) before the
  // viewport is known. Both branches reveal their own content once resolved.
  if (isMobile === null) {
    return <div className="min-h-dvh w-full bg-background" />;
  }

  return isMobile ? (
    <MobilePortfolio config={portfolioConfig} />
  ) : (
    <SpatialViewport config={portfolioConfig} />
  );
}

"use client";

import { SpatialViewport } from "@/components/spatial/SpatialViewport";
import { portfolioConfig } from "@/config/portfolio-config";

export default function Page() {
  return <SpatialViewport config={portfolioConfig} />;
}

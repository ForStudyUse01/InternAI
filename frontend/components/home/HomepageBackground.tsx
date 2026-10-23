"use client";

import { UiverseRainBackground } from "@/components/home/UiverseRainBackground";

/**
 * Layer stack (back → front):
 * 1. Uiverse tasty-dragon-12 (exact, unmodified)
 * 2. Very subtle readability overlay
 */
export function HomepageBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden [isolation:isolate]" aria-hidden>
      <div className="absolute inset-0 z-0">
        <UiverseRainBackground />
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#05060A]/10 via-transparent to-[#070A12]/16" />
      <div className="internai-vignette absolute inset-0 z-[1]" />
    </div>
  );
}

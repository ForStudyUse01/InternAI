"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const HeroAmbientCanvas = dynamic(
  () => import("@/components/landing/Hero/HeroAmbientCanvas").then((mod) => mod.HeroAmbientCanvas),
  { ssr: false }
);

/**
 * Ambient particle depth behind the existing product-preview card — purely
 * decorative, sits below the card's own glow/tilt layers. Desktop gets slow
 * cursor parallax; tablet gets fewer particles and no parallax; mobile and
 * reduced-motion render nothing, leaving the card's own tilt as the only
 * motion (matches the verified baseline exactly in those cases).
 */
export function HeroAmbientDepth() {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const reducedMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const showCanvas = mounted && !reducedMotion && (isDesktop || isTablet);

  return (
    <div className="hp-hero-ambient-canvas" aria-hidden>
      {showCanvas && <HeroAmbientCanvas particleCount={isDesktop ? 50 : 22} parallax={isDesktop} />}
    </div>
  );
}

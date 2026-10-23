"use client";

import { Scene } from "@/components/landing/3d/Scene/Scene";
import { CameraRig } from "@/components/landing/3d/CameraRig/CameraRig";
import { ParticleField } from "@/components/landing/3d/ParticleField/ParticleField";

type HeroAmbientCanvasProps = {
  particleCount: number;
  parallax: boolean;
};

// Three tight, InternAI-adjacent tones split across the field instead of one
// uniform color — cool blue carries the majority, soft neutral/white reads as
// brighter foreground specks, violet stays rare and dim so it registers as
// depth variation, not a second hue fighting the card's own blue accent.
const PALETTE = [
  { color: "#5eb7ff", size: 0.026, opacity: 0.4, share: 0.56 },
  { color: "#eaf2ff", size: 0.032, opacity: 0.5, share: 0.3 },
  { color: "#b3aaf5", size: 0.022, opacity: 0.3, share: 0.14 }
] as const;

export function HeroAmbientCanvas({ particleCount, parallax }: HeroAmbientCanvasProps) {
  return (
    <Scene>
      <CameraRig enabled={parallax} intensity={0.12} />
      {PALETTE.map((layer) => (
        <ParticleField
          key={layer.color}
          count={Math.max(1, Math.round(particleCount * layer.share))}
          radius={3.8}
          color={layer.color}
          size={layer.size}
          opacity={layer.opacity}
        />
      ))}
    </Scene>
  );
}

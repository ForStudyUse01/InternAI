"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";

type ParticleFieldProps = {
  count?: number;
  radius?: number;
  /** Idle drift; disabled under reduced motion (field still renders, just static). */
  enabled?: boolean;
  color?: string;
  size?: number;
  opacity?: number;
};

export function ParticleField({
  count = 90,
  radius = 6.5,
  enabled = true,
  color = "#5eb7ff",
  size = 0.028,
  opacity = 0.45
}: ParticleFieldProps) {
  const pointsRef = useRef<Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.35 + Math.random() * 0.65);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      array[i * 3 + 2] = r * Math.cos(phi) * 0.5 - 1.5;
    }
    return array;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!enabled || !pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

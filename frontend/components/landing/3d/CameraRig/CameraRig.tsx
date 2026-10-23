"use client";

import { useFrame } from "@react-three/fiber";

type CameraRigProps = {
  /** Cursor-driven parallax; disabled on touch devices and reduced motion. */
  enabled?: boolean;
  intensity?: number;
};

export function CameraRig({ enabled = true, intensity = 0.35 }: CameraRigProps) {
  useFrame((state) => {
    const targetX = enabled ? state.pointer.x * intensity : 0;
    const targetY = enabled ? state.pointer.y * intensity * 0.6 : 0;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.045;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.045;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

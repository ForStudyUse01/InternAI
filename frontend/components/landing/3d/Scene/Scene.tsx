"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";

type SceneProps = {
  children: ReactNode;
  className?: string;
  dpr?: [number, number];
  /** "demand" only re-renders when invalidate() is called — the caller owns
   * driving that. Defaults to "always" so existing callers are unaffected. */
  frameloop?: "always" | "demand";
};

export function Scene({ children, className, dpr = [1, 1.75], frameloop = "always" }: SceneProps) {
  return (
    <Canvas
      className={className}
      dpr={dpr}
      frameloop={frameloop}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 7.5], fov: 42 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}

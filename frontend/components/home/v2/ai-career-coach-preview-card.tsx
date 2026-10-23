"use client";

import { Sparkles } from "lucide-react";
import { memo, useEffect, useRef } from "react";

const MAX_TILT_DEG = 5;
const LIFT_PX = 10;
const SPRING = 0.1;
const SETTLE_EPSILON = 0.035;

type TiltState = {
  rx: number;
  ry: number;
  tz: number;
  targetRx: number;
  targetRy: number;
  targetTz: number;
};

function createTiltState(): TiltState {
  return { rx: 0, ry: 0, tz: 0, targetRx: 0, targetRy: 0, targetTz: 0 };
}

function isSettled(state: TiltState) {
  return (
    Math.abs(state.rx - state.targetRx) < SETTLE_EPSILON &&
    Math.abs(state.ry - state.targetRy) < SETTLE_EPSILON &&
    Math.abs(state.tz - state.targetTz) < SETTLE_EPSILON
  );
}

export const AiCareerCoachPreviewCard = memo(function AiCareerCoachPreviewCard() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scoreValueRef = useRef<HTMLSpanElement>(null);
  const skillsRef = useRef<HTMLUListElement>(null);
  const accentRef = useRef<HTMLDivElement>(null);
  const tiltStateRef = useRef<TiltState>(createTiltState());
  const pointerNormRef = useRef({ nx: 0, ny: 0 });
  const rafRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);

  useEffect(() => {
    const scene = sceneRef.current;
    const tilt = tiltRef.current;
    if (!scene || !tilt) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const tiltEnabled = !reducedMotion && finePointer;

    if (!tiltEnabled) {
      tilt.style.transform = "rotateX(0deg) rotateY(0deg)";
      return;
    }

    const state = tiltStateRef.current;

    const applyTilt = () => {
      tilt.style.transform = `translateZ(${state.tz.toFixed(2)}px) rotateX(${state.rx.toFixed(3)}deg) rotateY(${state.ry.toFixed(3)}deg)`;

      // Card elements sit at slightly different depths, so they drift a
      // little relative to each other as the card tilts — a cheap 2D
      // parallax stand-in for true layered 3D, cross-browser safe.
      if (headerRef.current) {
        headerRef.current.style.transform = `translate(${(state.ry * 0.4).toFixed(2)}px, ${(-state.rx * 0.3).toFixed(2)}px)`;
      }
      if (scoreValueRef.current) {
        scoreValueRef.current.style.transform = `translate(${(state.ry * 0.55).toFixed(2)}px, ${(-state.rx * 0.4).toFixed(2)}px)`;
      }
      if (skillsRef.current) {
        skillsRef.current.style.transform = `translate(${(state.ry * 0.25).toFixed(2)}px, ${(-state.rx * 0.18).toFixed(2)}px)`;
      }
      if (accentRef.current) {
        accentRef.current.style.transform = `translate(${(state.ry * 0.45).toFixed(2)}px, ${(-state.rx * 0.32).toFixed(2)}px)`;
      }

      // Shadow drifts opposite the tilt, as if cast by a fixed light source.
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate(${(-state.ry * 1.1).toFixed(2)}px, ${(8 + state.rx * 0.6).toFixed(2)}px)`;
      }

      if (sheenRef.current) {
        const { nx, ny } = pointerNormRef.current;
        sheenRef.current.style.setProperty("--sheen-x", `${((nx + 0.5) * 100).toFixed(1)}%`);
        sheenRef.current.style.setProperty("--sheen-y", `${((ny + 0.5) * 100).toFixed(1)}%`);
      }
    };

    const tick = () => {
      state.rx += (state.targetRx - state.rx) * SPRING;
      state.ry += (state.targetRy - state.ry) * SPRING;
      state.tz += (state.targetTz - state.tz) * SPRING;
      applyTilt();

      if (hoveringRef.current || !isSettled(state)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const startLoop = () => {
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const updateTargets = (clientX: number, clientY: number) => {
      const rect = scene.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = (clientX - rect.left) / rect.width - 0.5;
      const ny = (clientY - rect.top) / rect.height - 0.5;
      pointerNormRef.current.nx = nx;
      pointerNormRef.current.ny = ny;

      state.targetRy = nx * MAX_TILT_DEG * 2;
      state.targetRx = -ny * MAX_TILT_DEG * 2;
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hoveringRef.current = true;
      state.targetTz = LIFT_PX;
      if (sheenRef.current) sheenRef.current.style.opacity = "1";
      updateTargets(event.clientX, event.clientY);
      startLoop();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !hoveringRef.current) return;
      updateTargets(event.clientX, event.clientY);
      startLoop();
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hoveringRef.current = false;
      state.targetRx = 0;
      state.targetRy = 0;
      state.targetTz = 0;
      if (sheenRef.current) sheenRef.current.style.opacity = "0";
      startLoop();
    };

    scene.addEventListener("pointerenter", onPointerEnter);
    scene.addEventListener("pointermove", onPointerMove);
    scene.addEventListener("pointerleave", onPointerLeave);

    return () => {
      scene.removeEventListener("pointerenter", onPointerEnter);
      scene.removeEventListener("pointermove", onPointerMove);
      scene.removeEventListener("pointerleave", onPointerLeave);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={sceneRef} className="hp-preview-3d-scene">
      <div ref={tiltRef} className="hp-preview-3d-tilt">
        <div ref={shadowRef} className="hp-preview-3d-shadow" aria-hidden />
        <div className="hp-preview-3d-glow" aria-hidden />
        <div className="hp-preview-3d-float">
          <aside className="hp-preview hp-surface hp-preview-3d-card" aria-label="AI Career Coach preview">
            <div ref={sheenRef} className="hp-preview-3d-sheen" aria-hidden />
            <div ref={headerRef} className="hp-preview-header">
              <Sparkles className="h-4 w-4 text-[var(--hp-accent)]" strokeWidth={1.5} aria-hidden />
              <span>AI Career Coach</span>
            </div>
            <div className="hp-preview-score">
              <span className="hp-preview-score-label">Resume Match Score</span>
              <span ref={scoreValueRef} className="hp-preview-score-value">82%</span>
            </div>
            <div className="hp-preview-block">
              <p className="hp-preview-block-label">Top Missing Skills</p>
              <ul ref={skillsRef} className="hp-preview-skills">
                <li>SQL</li>
                <li>Power BI</li>
              </ul>
            </div>
            <div ref={accentRef} className="hp-preview-block hp-preview-block--accent">
              <p className="hp-preview-block-label">Recommended Next Step</p>
              <p className="hp-preview-next">Complete Data Analytics Learning Path</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
});

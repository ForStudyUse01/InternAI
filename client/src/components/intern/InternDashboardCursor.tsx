import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const HOTSPOT_OFFSET = "translate(-20%, -20%)";
const TRAIL_GLYPHS = ["💵", "💰", "🪙", "🤑", "₹"] as const;
const POOL_SIZE = 15;
const PARTICLE_Z = 9998;
const SPAWN_INTERVAL_MS = 60;
const SLOW_FRAME_MS = 52;
const SLOW_STREAK_DISABLE = 4;
const TRAIL_COOLDOWN_MS = 6000;

function internCursorEnvironmentMatches(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
  );
}

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return saveData === true || cores <= 4 || mem < 4;
}

function pickGlyph(): string {
  return TRAIL_GLYPHS[Math.floor(Math.random() * TRAIL_GLYPHS.length)] ?? "💵";
}

/**
 * Custom cursor: rAF-driven transform (GPU). Trail: throttled spawn, pooled nodes, WAAPI (transform + opacity only).
 */
export function InternDashboardCursor() {
  const enabled = internCursorEnvironmentMatches();
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const trailLayerRef = useRef<HTMLDivElement | null>(null);
  const poolIndexRef = useRef(0);
  const poolRef = useRef<HTMLSpanElement[]>([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const trailAllowedRef = useRef(!isLowEndDevice());
  const slowStreakRef = useRef(0);
  const trailCooldownUntilRef = useRef(0);
  const prevFrameRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("intern-dashboard-cursor-page");
    return () => {
      document.body.classList.remove("intern-dashboard-cursor-page");
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const el = cursorRef.current;
    const layer = trailLayerRef.current;
    if (!el || !layer) return;

    poolRef.current.forEach((n) => {
      n.getAnimations().forEach((a) => a.cancel());
      n.remove();
    });
    poolRef.current = [];
    const particles: HTMLSpanElement[] = [];
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const span = document.createElement("span");
      span.className = "intern-cursor-trail-particle";
      span.setAttribute("aria-hidden", "true");
      layer.appendChild(span);
      particles.push(span);
    }
    poolRef.current = particles;
    poolIndexRef.current = 0;

    const spawnParticle = (clientX: number, clientY: number) => {
      if (!trailAllowedRef.current) return;
      const now = performance.now();
      if (now < trailCooldownUntilRef.current) return;

      const node = particles[poolIndexRef.current % POOL_SIZE];
      poolIndexRef.current += 1;
      node.getAnimations().forEach((a) => a.cancel());

      const ox = (Math.random() - 0.5) * 20;
      const oy = (Math.random() - 0.5) * 20;
      const dx = (Math.random() - 0.5) * 24;
      const dy = 14 + Math.random() * 14;
      const duration = 600 + Math.random() * 300;
      const fontPx = 12 + Math.random() * 2;

      node.textContent = pickGlyph();
      node.style.fontSize = `${fontPx.toFixed(1)}px`;
      node.style.position = "fixed";
      node.style.left = "0";
      node.style.top = "0";
      node.style.zIndex = String(PARTICLE_Z);
      node.style.willChange = "transform, opacity";

      const x0 = clientX + ox;
      const y0 = clientY + oy;
      const x1 = x0 + dx;
      const y1 = y0 + dy;

      node.style.opacity = "1";
      node.style.transform = `translate3d(${x0}px, ${y0}px, 0) scale(1)`;

      const anim = node.animate(
        [
          { transform: `translate3d(${x0}px, ${y0}px, 0) scale(1)`, opacity: 1 },
          { transform: `translate3d(${x1}px, ${y1}px, 0) scale(0.6)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(0.33, 1, 0.2, 1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        node.style.willChange = "auto";
      };
    };

    const onMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
      visibleRef.current = true;
    };

    const onLeave = () => {
      visibleRef.current = false;
    };

    el.style.opacity = "0";
    el.style.transform = `translate3d(0px, 0px, 0) ${HOTSPOT_OFFSET}`;

    const tick = (t: number) => {
      const prev = prevFrameRef.current;
      prevFrameRef.current = t;
      if (prev > 0) {
        const dt = t - prev;
        if (dt > SLOW_FRAME_MS) {
          slowStreakRef.current += 1;
          if (slowStreakRef.current >= SLOW_STREAK_DISABLE) {
            trailAllowedRef.current = false;
            trailCooldownUntilRef.current = t + TRAIL_COOLDOWN_MS;
            slowStreakRef.current = 0;
          }
        } else {
          slowStreakRef.current = Math.max(0, slowStreakRef.current - 0.35);
        }
      }
      if (t >= trailCooldownUntilRef.current && !trailAllowedRef.current && !isLowEndDevice()) {
        trailAllowedRef.current = true;
      }

      const { x, y } = mouseRef.current;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) ${HOTSPOT_OFFSET}`;
      el.style.opacity = visibleRef.current ? "1" : "0";

      if (visibleRef.current && trailAllowedRef.current && t - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
        lastSpawnRef.current = t;
        spawnParticle(x, y);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    document.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      particles.forEach((n) => {
        n.getAnimations().forEach((a) => a.cancel());
        n.remove();
      });
      poolRef.current = [];
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    };
  }, [enabled]);

  if (!enabled) return null;

  const trailLayer = (
    <div
      ref={trailLayerRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: PARTICLE_Z }}
      aria-hidden
    />
  );

  const cursor = <div ref={cursorRef} id="custom-cursor" aria-hidden />;

  return createPortal(
    <>
      {trailLayer}
      {cursor}
    </>,
    document.body,
  );
}

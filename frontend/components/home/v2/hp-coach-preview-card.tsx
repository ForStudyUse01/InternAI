"use client";

import { memo, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const DEFAULT_ALIGNMENT_SCORE = 78;

type HpCoachPreviewCardProps = {
  score?: number;
};

export const HpCoachPreviewCard = memo(function HpCoachPreviewCard({
  score = DEFAULT_ALIGNMENT_SCORE
}: HpCoachPreviewCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const glowActive = isInView && !reducedMotion;
  const label = `${score}%`;

  return (
    <div ref={containerRef} className="hp-coach hp-surface">
      <p className="hp-coach-tag">Insight · Data Analyst track</p>
      <blockquote className="hp-coach-quote">
        You are <strong>{label}</strong> aligned with Data Analyst roles. Improving SQL and Power BI can
        significantly increase matching opportunities.
      </blockquote>
      <div className="hp-coach-metric">
        <strong>{label}</strong>
        <span>role alignment</span>
      </div>
      <div
        className="hp-coach-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Role alignment score"
        style={{ "--hp-progress": `${score}%` } as React.CSSProperties}
      >
        <span className={`hp-coach-bar-fill${glowActive ? " hp-coach-bar-fill--active" : ""}`}>
          <span className="hp-coach-bar-glow" aria-hidden />
        </span>
      </div>
    </div>
  );
});

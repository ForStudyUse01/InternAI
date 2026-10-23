"use client";

import type { AttemptHistoryPoint } from "@/lib/aptitude-progress";

type Props = {
  attempts: AttemptHistoryPoint[];
  maxScore?: number;
};

function AttemptLineChart({
  attempts,
  valueKey,
  label,
  color,
  maxY
}: {
  attempts: AttemptHistoryPoint[];
  valueKey: "score" | "readiness" | "accuracy";
  label: string;
  color: string;
  maxY: number;
}) {
  const width = 300;
  const height = 130;
  const pad = { top: 12, right: 12, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const points = attempts.map((attempt, index) => {
    const x = pad.left + (attempts.length === 1 ? innerW / 2 : (index / (attempts.length - 1)) * innerW);
    const y = pad.top + innerH - (attempt[valueKey] / maxY) * innerH;
    return { x, y, attempt: attempt.attempt, value: attempt[valueKey] };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--ds-text-secondary)]">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" role="img" aria-label={label}>
        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          stroke="var(--ds-border)"
          strokeWidth="1"
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {points.map((point) => (
          <g key={point.attempt}>
            <circle cx={point.x} cy={point.y} r="3.5" fill={color} />
            <text x={point.x} y={height - 8} textAnchor="middle" className="fill-[var(--ds-muted)] text-[9px]">
              #{point.attempt}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function AptitudeAttemptChart({ attempts, maxScore }: Props) {
  if (!attempts.length) {
    return (
      <p className="text-sm text-[var(--ds-muted)]">Complete an attempt to see your trend.</p>
    );
  }

  const scoreMax = maxScore ?? Math.max(...attempts.map((a) => a.score), 10);
  const trend =
    attempts.length >= 2 ? attempts[attempts.length - 1].score - attempts[0].score : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--ds-muted)]">
        <span>Last {attempts.length} attempt{attempts.length === 1 ? "" : "s"}</span>
        {attempts.length >= 2 ? (
          <span style={{ color: trend >= 0 ? "var(--ds-success)" : "var(--ds-danger)" }}>
            {trend >= 0 ? "+" : ""}
            {trend} score vs first attempt
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AttemptLineChart attempts={attempts} valueKey="score" label="Score by attempt" color="var(--ds-chart-1)" maxY={scoreMax} />
        <AttemptLineChart attempts={attempts} valueKey="readiness" label="Readiness by attempt" color="var(--ds-chart-3)" maxY={100} />
      </div>
    </div>
  );
}

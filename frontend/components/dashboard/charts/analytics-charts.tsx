"use client";

import { memo, useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TrendPoint = { label: string; value: number };
export type BarDatum = { label: string; value: number; hint?: string };

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const PADDING_X = 8;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

function buildAreaPath(points: { x: number; y: number }[], baselineY: number) {
  if (points.length === 0) return "";
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
}

function buildLinePath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

/**
 * Lightweight dependency-free SVG trend chart. No charting library is installed in this
 * project, so this renders directly to keep the bundle small for a handful of dashboard charts.
 */
function TrendAreaChartInner({
  data,
  valueLabel = "applications",
  className
}: {
  data: TrendPoint[];
  valueLabel?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const gradientId = useId();

  const { linePoints, maxValue, total, latest, gridLines } = useMemo(() => {
    const max = Math.max(...data.map((point) => point.value), 1);
    const plotWidth = CHART_WIDTH - PADDING_X * 2;
    const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;

    const points = data.map((point, index) => ({
      x: PADDING_X + step * index,
      y: PADDING_TOP + plotHeight - (point.value / max) * plotHeight,
      ...point
    }));

    const lines = [0, 0.5, 1].map((ratio) => ({
      y: PADDING_TOP + plotHeight * (1 - ratio),
      value: Math.round(max * ratio)
    }));

    return {
      linePoints: points,
      maxValue: max,
      total: data.reduce((sum, point) => sum + point.value, 0),
      latest: data[data.length - 1]?.value ?? 0,
      gridLines: lines
    };
  }, [data]);

  const baselineY = CHART_HEIGHT - PADDING_BOTTOM;
  const areaPath = buildAreaPath(linePoints, baselineY);
  const linePath = buildLinePath(linePoints);
  const labelStride = data.length > 8 ? Math.ceil(data.length / 6) : 1;

  return (
    <div className={cn("w-full", className)}>
      <p className="ds-caption">
        {total} {valueLabel} total &middot; latest period {latest}
      </p>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`Trend of ${valueLabel} over time. Total ${total}, most recent period ${latest}.`}
        className="mt-2 h-44 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((line) => (
          <g key={line.value}>
            <line
              x1={PADDING_X}
              x2={CHART_WIDTH - PADDING_X}
              y1={line.y}
              y2={line.y}
              stroke="var(--ds-border)"
              strokeWidth={1}
            />
            <text x={CHART_WIDTH - PADDING_X} y={line.y - 4} textAnchor="end" className="fill-[var(--ds-muted)] text-[10px]">
              {line.value}
            </text>
          </g>
        ))}

        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--ds-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
        />

        {linePoints.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r={3} fill="var(--ds-accent)">
            <title>
              {point.label}: {point.value} {valueLabel}
            </title>
          </circle>
        ))}

        {linePoints.map((point, index) =>
          index % labelStride === 0 ? (
            <text
              key={`label-${point.label}`}
              x={point.x}
              y={CHART_HEIGHT - 8}
              textAnchor={index === 0 ? "start" : index === linePoints.length - 1 ? "end" : "middle"}
              className="fill-[var(--ds-muted)] text-[10px]"
            >
              {point.label}
            </text>
          ) : null
        )}
      </svg>

      <table className="sr-only">
        <caption>{valueLabel} by period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TrendAreaChart = memo(TrendAreaChartInner);

function HorizontalBarChartInner({ data, className }: { data: BarDatum[]; className?: string }) {
  const reducedMotion = useReducedMotion();
  const maxValue = Math.max(...data.map((bar) => bar.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((bar) => (
        <div key={bar.label} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="ds-caption truncate font-medium text-[var(--ds-text)]">{bar.label}</span>
              {bar.hint ? <span className="ds-caption shrink-0">{bar.hint}</span> : null}
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--ds-surface-raised)]">
              <motion.div
                className="h-full rounded-full bg-[var(--ds-accent)]"
                initial={reducedMotion ? { width: `${Math.max(4, (bar.value / maxValue) * 100)}%` } : { width: 0 }}
                animate={{ width: `${Math.max(4, (bar.value / maxValue) * 100)}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
          <span className="text-right text-sm font-semibold tabular-nums">{bar.value}</span>
        </div>
      ))}
    </div>
  );
}

export const HorizontalBarChart = memo(HorizontalBarChartInner);

/**
 * Generic radial progress ring. Same visual language as the hand-rolled rings already
 * used in PlacementReadinessCard / MatchProgressRing, extracted so trend/score displays
 * across the app can share one implementation instead of re-deriving the SVG math.
 */
function ProgressRingInner({
  value,
  size = 112,
  strokeWidth = 10,
  label,
  sublabel,
  colorVar = "var(--ds-accent)",
  trackVar = "var(--ds-border)",
  className
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  colorVar?: string;
  trackVar?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label || "Progress"}: ${Math.round(clamped)}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackVar} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black tabular-nums text-[var(--ds-text)]">{Math.round(clamped)}</span>
        {sublabel ? <span className="text-[10px] font-medium text-[var(--ds-muted)]">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export const ProgressRing = memo(ProgressRingInner);

export type HeatmapCell = { date: string; count: number };

/** Local-calendar-day key (YYYY-MM-DD). Deliberately not toISOString(), which serializes
 *  in UTC and drifts the date by a day in any positive-offset timezone once local midnight
 *  crosses the UTC day boundary -- callers producing HeatmapCell dates must use this too. */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const HEATMAP_INTENSITY_STEPS = [
  "bg-[var(--ds-surface-raised)]",
  "bg-[var(--ds-accent)]/25",
  "bg-[var(--ds-accent)]/50",
  "bg-[var(--ds-accent)]/75",
  "bg-[var(--ds-accent)]"
];

function intensityClass(count: number, max: number) {
  if (count <= 0 || max <= 0) return HEATMAP_INTENSITY_STEPS[0];
  const ratio = count / max;
  if (ratio > 0.75) return HEATMAP_INTENSITY_STEPS[4];
  if (ratio > 0.5) return HEATMAP_INTENSITY_STEPS[3];
  if (ratio > 0.25) return HEATMAP_INTENSITY_STEPS[2];
  return HEATMAP_INTENSITY_STEPS[1];
}

/**
 * GitHub-style calendar heatmap: weeks as columns, Sun-Sat as rows, ending today.
 * Dependency-free div grid rather than SVG since cells are uniform squares.
 */
function ActivityHeatmapInner({
  data,
  weeks = 12,
  className
}: {
  data: HeatmapCell[];
  weeks?: number;
  className?: string;
}) {
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((cell) => map.set(cell.date, (map.get(cell.date) || 0) + cell.count));
    return map;
  }, [data]);

  const { columns, max, total } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = weeks * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1) - today.getDay());

    const days: HeatmapCell[] = [];
    for (let i = 0; i < totalDays + 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;
      const key = toLocalDateKey(d);
      days.push({ date: key, count: countByDate.get(key) || 0 });
    }

    const cols: HeatmapCell[][] = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

    return {
      columns: cols,
      max: Math.max(1, ...days.map((d) => d.count)),
      total: days.reduce((sum, d) => sum + d.count, 0)
    };
  }, [countByDate, weeks]);

  return (
    <div className={cn("w-full", className)}>
      <p className="ds-caption">{total} activity events in the last {weeks} weeks</p>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1" role="img" aria-label={`Activity heatmap, ${total} events over the last ${weeks} weeks`}>
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                className={cn("h-3 w-3 shrink-0 rounded-sm", intensityClass(cell.count, max))}
                title={`${cell.date}: ${cell.count} event${cell.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--ds-muted)]">
        <span>Less</span>
        {HEATMAP_INTENSITY_STEPS.map((step, idx) => (
          <span key={idx} className={cn("h-3 w-3 rounded-sm", step)} />
        ))}
        <span>More</span>
      </div>
      <table className="sr-only">
        <caption>Daily activity count</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Events</th>
          </tr>
        </thead>
        <tbody>
          {columns.flat().map((cell) => (
            <tr key={cell.date}>
              <td>{cell.date}</td>
              <td>{cell.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ActivityHeatmap = memo(ActivityHeatmapInner);

export type StatusSegment = { key: string; label: string; value: number; colorVar: string };

/**
 * Generic stacked-bar status breakdown (proportional segments + legend). Same visual
 * pattern as the applications-only ApplicationStatusBreakdown, generalized so it can
 * also drive an interviews-by-status breakdown without duplicating the layout.
 */
function StackedStatusBarInner({ segments, className }: { segments: StatusSegment[]; className?: string }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const visible = segments.filter((seg) => seg.value > 0);

  if (total === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-[var(--ds-surface-raised)]" role="img" aria-label="Status breakdown">
        {visible.map((seg) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-700 ease-out"
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.colorVar }}
            title={`${seg.label}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {visible.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[var(--ds-text-secondary)]">
              <span className="h-2 w-2 rounded-full" style={{ background: seg.colorVar }} />
              {seg.label}
            </span>
            <span className="font-semibold tabular-nums text-[var(--ds-text)]">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const StackedStatusBar = memo(StackedStatusBarInner);

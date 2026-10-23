/**
 * Client-only rolling 7-day snapshot diff for the dashboard's "Weekly Progress" section.
 * No backend involved: reads/writes a localStorage baseline per user and diffs the
 * currently-loaded dashboard metrics against it, rolling the baseline forward once a
 * week has elapsed since it was recorded.
 */

export type WeeklyProgressMetrics = {
  resumeScore: number;
  atsScore: number;
  applications: number;
  interviews: number;
  profileCompletion: number;
};

export type WeeklyProgressSnapshot = WeeklyProgressMetrics & {
  deltas: WeeklyProgressMetrics;
  isBaseline: boolean;
};

const STORAGE_PREFIX = "internai_weekly_progress_";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const ZERO_DELTAS: WeeklyProgressMetrics = {
  resumeScore: 0,
  atsScore: 0,
  applications: 0,
  interviews: 0,
  profileCompletion: 0
};

export function getWeeklyProgress(userKey: string, current: WeeklyProgressMetrics): WeeklyProgressSnapshot {
  if (typeof window === "undefined") {
    return { ...current, deltas: ZERO_DELTAS, isBaseline: true };
  }

  const storageKey = `${STORAGE_PREFIX}${userKey || "anon"}`;

  let baseline: (WeeklyProgressMetrics & { timestamp: number }) | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) baseline = JSON.parse(raw);
  } catch {
    baseline = null;
  }

  if (!baseline) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...current, timestamp: Date.now() }));
    } catch {
      // localStorage unavailable (private mode, quota) -- fall back to a baseline-only view
    }
    return { ...current, deltas: ZERO_DELTAS, isBaseline: true };
  }

  const deltas: WeeklyProgressMetrics = {
    resumeScore: current.resumeScore - baseline.resumeScore,
    atsScore: current.atsScore - baseline.atsScore,
    applications: current.applications - baseline.applications,
    interviews: current.interviews - baseline.interviews,
    profileCompletion: current.profileCompletion - baseline.profileCompletion
  };

  if (Date.now() - baseline.timestamp >= WEEK_MS) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...current, timestamp: Date.now() }));
    } catch {
      // ignore -- next successful load will retry the roll-forward
    }
  }

  return { ...current, deltas, isBaseline: false };
}

/**
 * Rolling per-day snapshot series of the same dashboard metrics, for trend charts.
 * Separate storage from the baseline-diff above: one point per calendar day (today's
 * point is overwritten on repeat visits), capped so history can't grow unbounded.
 */

export type ProgressHistoryPoint = WeeklyProgressMetrics & { date: string; readiness?: number };

const HISTORY_PREFIX = "internai_progress_history_";
const MAX_HISTORY_POINTS = 16;

export function recordProgressHistory(
  userKey: string,
  current: WeeklyProgressMetrics & { readiness?: number }
): ProgressHistoryPoint[] {
  if (typeof window === "undefined") return [];

  const storageKey = `${HISTORY_PREFIX}${userKey || "anon"}`;
  let history: ProgressHistoryPoint[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) history = JSON.parse(raw);
  } catch {
    history = [];
  }
  if (!Array.isArray(history)) history = [];

  const today = new Date().toISOString().slice(0, 10);
  const next = [...history.filter((point) => point.date !== today), { ...current, date: today }].slice(
    -MAX_HISTORY_POINTS
  );

  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // ignore quota errors -- in-memory `next` is still returned for this render
  }

  return next;
}

export function getProgressHistory(userKey: string): ProgressHistoryPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${userKey || "anon"}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

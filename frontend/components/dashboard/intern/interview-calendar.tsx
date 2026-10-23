"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Code2,
  List,
  MapPin,
  Plus,
  RotateCcw,
  StickyNote,
  Users,
  Video,
  type LucideIcon
} from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { useTablistKeyboard } from "@/lib/use-tablist-keyboard";
import type { Application } from "@/lib/intern-portal";
import type { CompanyApplication } from "@/lib/company-portal";
import type { CalendarDayEntry } from "@/lib/calendar-stickers";
import {
  extractScheduledInterviews,
  formatInterviewDateTime,
  formatInterviewTimeLabel,
  getCalendarEventLabel,
  groupInterviewsByDate,
  isSameCalendarDay,
  resolveRoundDurationMinutes,
  resolveRoundInterviewers,
  toLocalDateKey,
  type InterviewDisplayStatus,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";
import {
  fetchCalendarEntries,
  groupCalendarEntriesByDate,
  monthGridDateRange,
  weekDateRange
} from "@/lib/calendar-personalization";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Button } from "@/components/ui/button";
import { InterviewStatusChip } from "@/components/dashboard/interview/interview-status-chip";
import { InterviewJoinButton } from "@/components/dashboard/interview/interview-join-button";
import { getInterviewJoinAvailability } from "@/lib/interview-join";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const CalendarDayDetailModal = dynamic(
  () => import("@/components/calendar/calendar-day-detail-modal").then((m) => m.CalendarDayDetailModal),
  { ssr: false }
);
const InterviewDetailsModal = dynamic(
  () => import("@/components/dashboard/interview/interview-details-modal").then((m) => m.InterviewDetailsModal),
  { ssr: false }
);

type CalendarView = "month" | "week" | "timeline";
type Audience = "intern" | "company";

type InterviewCalendarProps = {
  applications?: Application[] | CompanyApplication[];
  interviewRecords?: ScheduledInterviewRecord[];
  audience?: Audience;
  onViewProfile?: (applicationId: string) => void;
  hideTitle?: boolean;
};

const calendarSlideVariants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: -dir * 16 })
};

const EMPTY_ENTRIES: CalendarDayEntry[] = [];
const EMPTY_EVENTS: ScheduledInterviewRecord[] = [];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

type EventAccent = { dot: string; chip: string; bar: string };

const STATUS_ACCENTS: Record<InterviewDisplayStatus, EventAccent> = {
  upcoming: {
    dot: "bg-[var(--ds-info)]",
    bar: "bg-[var(--ds-info)]",
    chip: "border-[var(--ds-info)] bg-[var(--ds-info-bg)] text-[var(--ds-info)]"
  },
  scheduled: {
    dot: "bg-[var(--ds-warning)]",
    bar: "bg-[var(--ds-warning)]",
    chip: "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]"
  },
  in_progress: {
    dot: "bg-[var(--ds-accent)]",
    bar: "bg-[var(--ds-accent)]",
    chip: "border-[var(--ds-accent)] bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]"
  },
  completed: {
    dot: "bg-[var(--ds-success)]",
    bar: "bg-[var(--ds-success)]",
    chip: "border-[var(--ds-success)] bg-[var(--ds-success-bg)] text-[var(--ds-success)]"
  },
  cancelled: {
    dot: "bg-[var(--ds-danger)]",
    bar: "bg-[var(--ds-danger)]",
    chip: "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
  },
  no_show: {
    dot: "bg-[var(--ds-muted)]",
    bar: "bg-[var(--ds-muted)]",
    chip: "border-[var(--ds-border)] bg-[var(--ds-surface-raised)] text-[var(--ds-muted)]"
  }
};

function getInterviewIcon(item: ScheduledInterviewRecord): LucideIcon {
  const type = (item.interviewType || "").toLowerCase();
  if (type.includes("technical")) return Code2;
  if (type.includes("hr")) return Users;
  if (type.includes("final")) return Award;
  return item.mode === "offline" ? MapPin : Video;
}

function getAccent(item: ScheduledInterviewRecord): EventAccent {
  return STATUS_ACCENTS[item.interviewStatus] ?? STATUS_ACCENTS.scheduled;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayLabelFromKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ---------- Event chip (month / week) ---------- */

const EventChip = memo(function EventChip({
  event,
  audience,
  onSelect
}: {
  event: ScheduledInterviewRecord;
  audience: Audience;
  onSelect: (event: ScheduledInterviewRecord) => void;
}) {
  const Icon = getInterviewIcon(event);
  const accent = getAccent(event);
  const label = getCalendarEventLabel(event, audience);
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      title={`${label} · ${formatInterviewDateTime(event.interviewDate, event.interviewTime)}`}
      aria-label={`${event.interviewType} with ${label} at ${formatInterviewTimeLabel(event.interviewTime)}, status ${event.interviewStatus}`}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1.5 text-left text-[11px] font-semibold transition duration-150 hover:-translate-y-px hover:shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
        accent.chip
      )}
    >
      <AppIcon icon={Icon} size="xs" className="text-current" />
      <span className="shrink-0 tabular-nums opacity-80">{formatInterviewTimeLabel(event.interviewTime)}</span>
      <span className="truncate">{label}</span>
    </button>
  );
});

/* ---------- Event card (timeline / week) ---------- */

const EventCard = memo(function EventCard({
  event,
  audience,
  onSelect
}: {
  event: ScheduledInterviewRecord;
  audience: Audience;
  onSelect: (event: ScheduledInterviewRecord) => void;
}) {
  const Icon = getInterviewIcon(event);
  const accent = getAccent(event);
  const interviewers = resolveRoundInterviewers(event);
  const durationMinutes = resolveRoundDurationMinutes(event);
  const modeLabel = event.mode === "offline" ? "In person" : "Online";
  const ModeIcon = event.mode === "offline" ? MapPin : Video;
  const joinAvailability = getInterviewJoinAvailability(event);
  const showJoinSlot = audience === "company" && Boolean(joinAvailability.joinHref);

  return (
    <div className="group flex w-full items-stretch gap-0 overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-left transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-[var(--ds-primary)] hover:shadow-md">
      <span className={cn("w-1 shrink-0", accent.bar)} aria-hidden />
      <button type="button" onClick={() => onSelect(event)} className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]">
        <span className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", accent.chip)}>
            <AppIcon icon={Icon} size="sm" className="text-current" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-[var(--ds-text)]">{event.interviewType}</span>
              <InterviewStatusChip status={event.interviewStatus} />
            </span>
            <span className="mt-0.5 block truncate text-xs text-[var(--ds-text-secondary)]">
              {getCalendarEventLabel(event, audience)} · {event.role}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--ds-muted)]">
              <span className="whitespace-nowrap">{formatInterviewDateTime(event.interviewDate, event.interviewTime)}</span>
              <span className="whitespace-nowrap">{durationMinutes} min</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <AppIcon icon={ModeIcon} size="xs" />
                {modeLabel}
              </span>
              {interviewers.length > 0 ? (
                <span className="inline-flex items-center gap-1 truncate">
                  <AppIcon icon={Users} size="xs" />
                  <span className="truncate">{interviewers.map((entry) => entry.name).join(", ")}</span>
                </span>
              ) : null}
            </span>
            {event.notes ? (
              <span className="mt-1 block truncate text-[11px] italic text-[var(--ds-muted)]">
                <AppIcon icon={StickyNote} size="xs" className="mr-1 shrink-0 align-[-2px]" />
                {event.notes}
              </span>
            ) : null}
          </span>
        </span>
      </button>
      {showJoinSlot ? (
        <span className="flex shrink-0 items-center px-3">
          <InterviewJoinButton interview={event} size="sm" />
        </span>
      ) : null}
    </div>
  );
});

/* ---------- Month day cell ---------- */

const MonthDayCell = memo(function MonthDayCell({
  day,
  inMonth,
  isToday,
  isSelected,
  events,
  entries,
  audience,
  onOpenDay,
  onSelectEvent
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: ScheduledInterviewRecord[];
  entries: CalendarDayEntry[];
  audience: Audience;
  onOpenDay: (dateKey: string) => void;
  onSelectEvent: (event: ScheduledInterviewRecord) => void;
}) {
  const dayKey = toLocalDateKey(day);
  const stickers = entries.filter((entry) => entry.entryType === "sticker").map((entry) => entry.emoji || "🙂");
  const noteCount = entries.filter((entry) => entry.entryType === "note").length;
  const hasPersonal = stickers.length > 0 || noteCount > 0;
  return (
    <div
      role="gridcell"
      className={cn(
        "group relative flex min-h-[110px] flex-col gap-1 border-b border-r border-[var(--ds-border)] p-1.5 transition-colors duration-150 hover:bg-[var(--ds-hover)]",
        !inMonth && "bg-[var(--ds-surface)] opacity-60",
        isToday && "bg-[color-mix(in_srgb,var(--ds-primary)_6%,transparent)]",
        isSelected
          ? "ring-2 ring-inset ring-[var(--ds-primary-text)] dark:ring-[var(--ds-primary)]"
          : isToday && "ring-1 ring-inset ring-[color-mix(in_srgb,var(--ds-primary-text)_40%,transparent)] dark:ring-[color-mix(in_srgb,var(--ds-primary)_40%,transparent)]"
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenDay(dayKey)}
          aria-label={`${dayLabelFromKey(dayKey)}. ${events.length} interview${events.length === 1 ? "" : "s"}. Open day details.`}
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
            isToday
              ? "bg-[var(--ds-primary)] text-[var(--ds-on-primary)]"
              : inMonth
                ? "text-[var(--ds-text)] hover:bg-[var(--ds-hover)]"
                : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)]"
          )}
        >
          {day.getDate()}
        </button>
        <button
          type="button"
          onClick={() => onOpenDay(dayKey)}
          aria-label={`Add note or sticker for ${dayLabelFromKey(dayKey)}`}
          className="rounded-md p-0.5 text-[var(--ds-muted)] opacity-0 transition hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <AppIcon icon={Plus} size="xs" />
        </button>
      </div>

      {hasPersonal ? (
        <button
          type="button"
          onClick={() => onOpenDay(dayKey)}
          aria-label={`${stickers.length} sticker${stickers.length === 1 ? "" : "s"}, ${noteCount} note${noteCount === 1 ? "" : "s"}`}
          className="flex items-center gap-1.5 self-start rounded-full bg-[var(--ds-surface-raised)] px-2 py-0.5 text-[10px] leading-none transition hover:bg-[var(--ds-hover)]"
        >
          {stickers.slice(0, 3).map((emoji, index) => (
            <span key={index} aria-hidden className="text-lg leading-none">
              {emoji}
            </span>
          ))}
          {noteCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[var(--ds-muted)]">
              <AppIcon icon={StickyNote} size="xs" />
              {noteCount}
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="mt-auto space-y-1">
        {events.slice(0, 2).map((event) => (
          <EventChip key={event.interviewId} event={event} audience={audience} onSelect={onSelectEvent} />
        ))}
        {events.length > 2 ? (
          <button
            type="button"
            onClick={() => onOpenDay(dayKey)}
            className="w-full rounded px-1 text-left text-[11px] font-semibold text-[var(--ds-muted)] hover:text-[var(--ds-primary-text)]"
          >
            +{events.length - 2} more
          </button>
        ) : null}
      </div>
    </div>
  );
});

/* ---------- Skeleton ---------- */

function CalendarSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--ds-border)]" aria-hidden>
      <div className="grid grid-cols-7 border-b border-[var(--ds-border)] bg-[var(--ds-surface)]">
        {WEEKDAYS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }).map((_, index) => (
          <div key={index} className="min-h-[104px] border-b border-r border-[var(--ds-border)] p-2">
            <div className="h-5 w-5 rounded-full bg-[var(--ds-surface-raised)]" />
            <div className="mt-3 space-y-1">
              {index % 4 === 0 ? <div className="h-4 w-full animate-pulse rounded bg-[var(--ds-surface-raised)]" /> : null}
              {index % 3 === 0 ? <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--ds-surface-raised)]" /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export function InterviewCalendar({
  applications = [],
  interviewRecords,
  audience = "intern",
  onViewProfile,
  hideTitle = false
}: InterviewCalendarProps) {
  const [view, setView] = useState<CalendarView>("month");
  const viewTablistRef = useRef<HTMLDivElement>(null);
  useTablistKeyboard(viewTablistRef);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<ScheduledInterviewRecord | null>(null);
  const [dayModalKey, setDayModalKey] = useState<string | null>(null);
  const [personalEntries, setPersonalEntries] = useState<CalendarDayEntry[]>([]);
  const [entriesStatus, setEntriesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const interviews = useMemo(
    () => interviewRecords ?? extractScheduledInterviews(applications),
    [applications, interviewRecords]
  );
  const grouped = useMemo(() => groupInterviewsByDate(interviews), [interviews]);
  const personalByDate = useMemo(() => groupCalendarEntriesByDate(personalEntries), [personalEntries]);

  const monthLabel = MONTHS[cursor.getMonth()];
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return day;
      }),
    [weekStart]
  );

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [cursor]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const cursorYear = cursor.getFullYear();
    const min = Math.min(current - 2, cursorYear);
    const max = Math.max(current + 3, cursorYear);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [cursor]);

  const fetchRange = useMemo(() => {
    if (view === "week") return weekDateRange(weekStart);
    if (view === "month") return monthGridDateRange(cursor);
    return null;
  }, [view, cursor, weekStart]);

  useEffect(() => {
    if (!fetchRange) return;
    const { from, to } = fetchRange;
    let cancelled = false;
    setEntriesStatus("loading");

    fetchCalendarEntries(from, to)
      .then((entries) => {
        if (cancelled) return;
        setPersonalEntries((current) => {
          const outside = current.filter((entry) => entry.dateKey < from || entry.dateKey > to);
          return [...outside, ...entries];
        });
        setEntriesStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setEntriesStatus("error");
      })
      .finally(() => {
        if (!cancelled) setHasLoadedOnce(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchRange, reloadToken]);

  const eventsForDay = useCallback((day: Date) => grouped.get(toLocalDateKey(day)) || [], [grouped]);

  const updateDayEntries = useCallback((dateKey: string, nextEntries: CalendarDayEntry[]) => {
    setPersonalEntries((current) => {
      const withoutDay = current.filter((entry) => entry.dateKey !== dateKey);
      return [...withoutDay, ...nextEntries];
    });
  }, []);

const directionRef = useRef<1 | -1>(1);

  const goToday = useCallback(() => {
    setCursor((current) => {
      directionRef.current = new Date() >= current ? 1 : -1;
      return new Date();
    });
  }, []);
  const stepBackward = useCallback(() => {
    directionRef.current = -1;
    setCursor((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(current.getMonth() - 1);
      else next.setDate(current.getDate() - 7);
      return next;
    });
  }, [view]);
  const stepForward = useCallback(() => {
    directionRef.current = 1;
    setCursor((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(current.getMonth() + 1);
      else next.setDate(current.getDate() + 7);
      return next;
    });
  }, [view]);

  const selectEvent = useCallback((event: ScheduledInterviewRecord) => setSelected(event), []);
  const openDay = useCallback((dateKey: string) => setDayModalKey(dateKey), []);
  const retryEntries = useCallback(() => {
    setEntriesStatus("loading");
    setReloadToken((token) => token + 1);
  }, []);

  const subtitle =
    audience === "company"
      ? "Track interview schedules across month, week, and timeline views — annotate dates with notes and stickers."
      : "View your interview schedule and personalize any date with notes and stickers.";

  const showSkeleton = entriesStatus === "loading" && !hasLoadedOnce;
  const showError = entriesStatus === "error";
  const showNav = view !== "timeline";

  const dayEntries = dayModalKey ? personalByDate.get(dayModalKey) || [] : [];

  return (
    <>
      <SectionPanel title="Calendar" subtitle={subtitle} titleIcon={CalendarDays} hideTitle={hideTitle}>
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* View switcher */}
          <div
            ref={viewTablistRef}
            className="inline-flex w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 sm:w-auto"
            role="tablist"
            aria-label="Calendar view"
          >
            {([
              { mode: "month" as const, label: "Month", icon: CalendarDays },
              { mode: "week" as const, label: "Week", icon: CalendarRange },
              { mode: "timeline" as const, label: "Timeline", icon: List }
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] sm:flex-none",
                  view === mode
                    ? "text-[var(--ds-on-primary)]"
                    : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
                )}
              >
                {view === mode ? (
                  <motion.span
                    layoutId="calendar-view-pill"
                    className="absolute inset-0 rounded-lg bg-[var(--ds-primary)] shadow-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <AppIcon icon={Icon} size="xs" className="relative text-current" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          {/* Date navigation */}
          {showNav ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={goToday}>
                Today
              </Button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={stepBackward}
                  aria-label={view === "month" ? "Previous month" : "Previous week"}
                  className="rounded-lg border border-[var(--ds-border)] p-1.5 text-[var(--ds-muted)] transition hover:bg-[var(--ds-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                >
                  <AppIcon icon={ChevronLeft} size="sm" />
                </button>

                {view === "month" ? (
                  <div className="flex items-center gap-1">
                    <label className="sr-only" htmlFor="calendar-month-select">
                      Month
                    </label>
                    <select
                      id="calendar-month-select"
                      value={cursor.getMonth()}
                      onChange={(event) => setCursor(new Date(cursor.getFullYear(), Number(event.target.value), 1))}
                      className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1.5 text-sm font-semibold text-[var(--ds-text)] outline-none transition focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor="calendar-year-select">
                      Year
                    </label>
                    <select
                      id="calendar-year-select"
                      value={cursor.getFullYear()}
                      onChange={(event) => setCursor(new Date(Number(event.target.value), cursor.getMonth(), 1))}
                      className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1.5 text-sm font-semibold text-[var(--ds-text)] outline-none transition focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="min-w-[9.5rem] px-2 text-center text-sm font-semibold text-[var(--ds-text)]">
                    {monthLabel} {cursor.getDate()}, {cursor.getFullYear()}
                  </span>
                )}

                <button
                  type="button"
                  onClick={stepForward}
                  aria-label={view === "month" ? "Next month" : "Next week"}
                  className="rounded-lg border border-[var(--ds-border)] p-1.5 text-[var(--ds-muted)] transition hover:bg-[var(--ds-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                >
                  <AppIcon icon={ChevronRight} size="sm" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Error banner (non-blocking) */}
        {showError ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[var(--ds-danger)]">
              <AppIcon icon={AlertCircle} size="sm" className="text-current" />
              <span>Couldn&apos;t load your notes &amp; stickers. Interviews are still shown.</span>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={retryEntries}>
              <AppIcon icon={RotateCcw} size="xs" className="text-current" />
              Retry
            </Button>
          </div>
        ) : null}

        {/* Month view */}
        {view === "month" ? (
          showSkeleton ? (
            <CalendarSkeleton />
          ) : (
            <AnimatePresence mode="popLayout" initial={false} custom={directionRef.current}>
              <motion.div
                key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
                custom={directionRef.current}
                variants={calendarSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-[var(--ds-border)]"
                role="grid"
                aria-label={`${monthLabel} ${cursor.getFullYear()}`}
              >
              <div className="grid grid-cols-7 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                {WEEKDAYS.map((label) => (
                  <div key={label} role="columnheader" className="px-2 py-2">
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const dayKey = toLocalDateKey(day);
                  return (
                    <MonthDayCell
                      key={dayKey}
                      day={day}
                      inMonth={day.getMonth() === cursor.getMonth()}
                      isToday={isSameCalendarDay(day, new Date())}
                      isSelected={dayModalKey === dayKey}
                      events={grouped.get(dayKey) || EMPTY_EVENTS}
                      entries={personalByDate.get(dayKey) || EMPTY_ENTRIES}
                      audience={audience}
                      onOpenDay={openDay}
                      onSelectEvent={selectEvent}
                    />
                  );
                })}
              </div>
              </motion.div>
            </AnimatePresence>
          )
        ) : null}

        {/* Week view */}
        {view === "week" ? (
          showSkeleton ? (
            <CalendarSkeleton />
          ) : (
            <AnimatePresence mode="popLayout" initial={false} custom={directionRef.current}>
              <motion.div
                key={toLocalDateKey(weekStart)}
                custom={directionRef.current}
                variants={calendarSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7"
              >
              {weekDays.map((day) => {
                const dayKey = toLocalDateKey(day);
                const events = eventsForDay(day);
                const dayEntriesList = personalByDate.get(dayKey) || [];
                const stickers = dayEntriesList.filter((entry) => entry.entryType === "sticker");
                const noteCount = dayEntriesList.filter((entry) => entry.entryType === "note").length;
                const isToday = isSameCalendarDay(day, new Date());
                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "flex flex-col rounded-2xl border border-[var(--ds-border)] p-3 transition-colors duration-150",
                      isToday && "border-2 border-[var(--ds-primary-text)] bg-[color-mix(in_srgb,var(--ds-primary-text)_6%,transparent)] dark:border-[var(--ds-primary)] dark:bg-[color-mix(in_srgb,var(--ds-primary)_6%,transparent)]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openDay(dayKey)}
                      className="flex items-center justify-between rounded-lg p-1 -m-1 text-left transition hover:bg-[var(--ds-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                      aria-label={`Open ${dayLabelFromKey(dayKey)}`}
                    >
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <span className={cn("mt-0.5 block text-lg font-bold", isToday ? "text-[var(--ds-primary-text)]" : "text-[var(--ds-text)]")}>
                          {day.getDate()}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        {stickers.slice(0, 3).map((sticker, index) => (
                          <span key={index} aria-hidden className="text-lg leading-none">
                            {sticker.emoji || "🙂"}
                          </span>
                        ))}
                        {noteCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--ds-muted)]">
                            <AppIcon icon={StickyNote} size="xs" />
                            {noteCount}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    <div className="mt-3 space-y-2">
                      {events.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-[var(--ds-border)] px-2 py-3 text-center text-[11px] text-[var(--ds-muted)]">
                          No interviews
                        </p>
                      ) : (
                        events.map((event) => (
                          <EventCard key={event.interviewId} event={event} audience={audience} onSelect={selectEvent} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              </motion.div>
            </AnimatePresence>
          )
        ) : null}

        {/* Timeline view */}
        {view === "timeline" ? (
          interviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--ds-border)] px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ds-surface-raised)]">
                <AppIcon icon={CalendarX2} size="lg" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ds-text)]">No events scheduled</p>
                <p className="mt-1 text-xs text-[var(--ds-muted)]">
                  {audience === "company"
                    ? "Interviews you schedule will appear here as a chronological timeline."
                    : "Your upcoming interviews will appear here once they're scheduled."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {interviews.map((event) => (
                <EventCard key={event.interviewId} event={event} audience={audience} onSelect={selectEvent} />
              ))}
            </div>
          )
        ) : null}
      </SectionPanel>

      <InterviewDetailsModal
        open={Boolean(selected)}
        interview={selected}
        audience={audience}
        onViewProfile={onViewProfile}
        onClose={() => setSelected(null)}
      />

      <CalendarDayDetailModal
        open={Boolean(dayModalKey)}
        dateKey={dayModalKey}
        dateLabel={dayModalKey ? dayLabelFromKey(dayModalKey) : ""}
        entries={dayEntries}
        onClose={() => setDayModalKey(null)}
        onEntriesChange={(next) => {
          if (dayModalKey) updateDayEntries(dayModalKey, next);
        }}
      />
    </>
  );
}

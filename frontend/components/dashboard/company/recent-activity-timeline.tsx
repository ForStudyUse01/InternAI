"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, ClipboardList, Gift, MessageSquare, Sparkles } from "lucide-react";
import type { CompanyApplication } from "@/lib/company-portal";
import {
  CompanyDashboardEmptyState,
  CompanyDashboardPanelCard,
  CompanyDashboardSection
} from "./company-dashboard-layout";
import { AppIcon } from "@/components/icons/app-icon";
import { normalizeToPipelineStage } from "@/components/dashboard/hiring/hiring-utils";
import { fetchChatConversations } from "@/lib/chat-portal";
import { FEATURE_FLAGS } from "@/constants/featureFlags";

type TimelineEvent = {
  id: string;
  label: string;
  detail?: string;
  date: Date;
  icon: typeof Activity;
};

function timeOf(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildApplicationEvents(applications: CompanyApplication[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  applications.forEach((application) => {
    const candidate = application.intern?.fullName || "A candidate";
    const role = application.internship?.role || "a role";

    if (application.createdAt) {
      events.push({
        id: `applied-${application._id}`,
        label: `${candidate} applied to ${role}`,
        date: new Date(application.createdAt),
        icon: ClipboardList
      });
    }

    (application.stageHistory || []).forEach((entry, index) => {
      if (!entry.changedAt) return;
      const stage = normalizeToPipelineStage(entry.stage);
      if (stage === "shortlisted") {
        events.push({
          id: `shortlisted-${application._id}-${index}`,
          label: `${candidate} shortlisted for ${role}`,
          date: new Date(entry.changedAt),
          icon: Sparkles
        });
      }
      if (String(entry.stage || "").toLowerCase() === "offered" || String(entry.stage || "").toLowerCase() === "selected") {
        events.push({
          id: `offer-${application._id}-${index}`,
          label: `Offer extended to ${candidate}`,
          detail: role,
          date: new Date(entry.changedAt),
          icon: Gift
        });
      }
    });

    (application.interviewRounds || []).forEach((round, index) => {
      const when = round.updatedAt || round.interviewDate;
      if (!when) return;
      events.push({
        id: `interview-${application._id}-${index}`,
        label: `${candidate}'s ${round.roundType || "interview"} for ${role}`,
        detail: round.status ? round.status.replace(/_/g, " ") : undefined,
        date: new Date(when),
        icon: CalendarClock
      });
    });
  });

  return events;
}

type RecentActivityTimelineProps = {
  applications: CompanyApplication[];
  limit?: number;
};

export function RecentActivityTimeline({ applications, limit = 10 }: RecentActivityTimelineProps) {
  const [messageEvents, setMessageEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_CHAT) return;
    let cancelled = false;
    fetchChatConversations()
      .then((payload) => {
        if (cancelled) return;
        const events = (payload.conversations || [])
          .filter((conversation) => conversation.lastMessageAt)
          .map((conversation) => ({
            id: `message-${conversation._id}`,
            label: `New message from ${conversation.internProfile?.fullName || "a candidate"}`,
            detail: conversation.lastMessageText || undefined,
            date: new Date(conversation.lastMessageAt as string),
            icon: MessageSquare
          }));
        setMessageEvents(events);
      })
      .catch(() => setMessageEvents([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const events = useMemo(() => {
    const combined = [...buildApplicationEvents(applications), ...messageEvents];
    return combined
      .filter((event) => !Number.isNaN(event.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }, [applications, messageEvents, limit]);

  return (
    <CompanyDashboardSection
      id="dashboard-recent-activity"
      icon={Activity}
      title="Recent Activity"
      description="Applications, shortlists, interviews, offers, and messages in one timeline."
    >
      {events.length === 0 ? (
        <CompanyDashboardEmptyState title="No activity yet" description="Activity across your hiring pipeline will appear here." icon={Activity} />
      ) : (
        <CompanyDashboardPanelCard>
          <ol className="space-y-4">
            {events.map((event, idx) => (
              <li key={event.id} className="relative flex gap-3 pl-1">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]">
                    <AppIcon icon={event.icon} size="xs" className="text-current" />
                  </span>
                  {idx < events.length - 1 ? <span className="mt-1 h-full w-px flex-1 bg-[var(--ds-border)]" /> : null}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-medium text-[var(--ds-text)]">{event.label}</p>
                  {event.detail ? <p className="text-xs capitalize text-[var(--ds-muted)]">{event.detail}</p> : null}
                  <p className="mt-0.5 text-[11px] text-[var(--ds-muted)]">{event.date.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </CompanyDashboardPanelCard>
      )}
    </CompanyDashboardSection>
  );
}

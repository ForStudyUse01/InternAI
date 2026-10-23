"use client";

import { BarChart3, Calendar, CalendarClock, FilePlus2, MessageSquare, UsersRound, Users } from "lucide-react";
import { CompanyDashboardPanelCard, CompanyDashboardSection } from "@/components/dashboard/company/company-dashboard-layout";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";

type QuickActionsPanelProps = {
  canPostJob: boolean;
  isExecutive?: boolean;
  onViewAllApplications: () => void;
  onScheduleInterviews: () => void;
};

export function QuickActionsPanel({ canPostJob, isExecutive, onViewAllApplications, onScheduleInterviews }: QuickActionsPanelProps) {
  return (
    <CompanyDashboardSection
      id="hiring-actions"
      title="Quick Actions"
      description={isExecutive ? "Strategic oversight and hiring controls." : "What should I do next?"}
    >
      <CompanyDashboardPanelCard>
        <div className="flex flex-col gap-2">
          {canPostJob ? (
            <Button href="/dashboard/company/hiring/post" size="sm" className="w-full justify-start">
              <AppIcon icon={FilePlus2} size="sm" />
              Create Internship
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" className="w-full justify-start" onClick={onScheduleInterviews}>
            <AppIcon icon={CalendarClock} size="sm" />
            Schedule Interview
          </Button>
          <Button type="button" size="sm" variant="secondary" className="w-full justify-start" onClick={onViewAllApplications}>
            <AppIcon icon={Users} size="sm" />
            Review Candidates
          </Button>
          <Button href="/dashboard/company/chat" size="sm" variant="secondary" className="w-full justify-start">
            <AppIcon icon={MessageSquare} size="sm" />
            Messages
          </Button>
          <Button href="/dashboard/company/hiring/calendar" size="sm" variant="secondary" className="w-full justify-start">
            <AppIcon icon={Calendar} size="sm" />
            Calendar
          </Button>
          {isExecutive ? (
            <>
              <Button href="/dashboard/company/analytics/company" size="sm" variant="secondary" className="w-full justify-start">
                <AppIcon icon={BarChart3} size="sm" />
                View Company Analytics
              </Button>
              <Button href="/dashboard/company/team/recruiters" size="sm" variant="secondary" className="w-full justify-start">
                <AppIcon icon={UsersRound} size="sm" />
                Manage HR Team
              </Button>
            </>
          ) : null}
        </div>
      </CompanyDashboardPanelCard>
    </CompanyDashboardSection>
  );
}

"use client";

import { Award, ChevronDown, ChevronUp, Percent, ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import type { CompanyHrInsights, CompanyHrUser } from "@/lib/company-portal";
import { HR_ASSIGNABLE_PERMISSIONS } from "@/lib/company-portal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import {
  CompanyDashboardItemCard,
  CompanyDashboardPageIntro,
  companyDashboardStyles
} from "@/components/dashboard/company/company-dashboard-layout";
import { InfoTile, PermissionChip, field } from "@/components/dashboard/company/company-dashboard-shared";
import { SidebarModulePicker } from "@/components/dashboard/company/sidebar-module-picker";

type HrFormState = { name: string; email: string; password: string };

type CompanyTeamRecruitersViewProps = {
  canManageRecruiters: boolean;
  isCeoOrOwner: boolean;
  hrInsights: CompanyHrInsights | null;
  hrForm: HrFormState;
  setHrForm: React.Dispatch<React.SetStateAction<HrFormState>>;
  hrFormPermissions: string[];
  setHrFormPermissions: React.Dispatch<React.SetStateAction<string[]>>;
  hrFormModules: string[];
  setHrFormModules: React.Dispatch<React.SetStateAction<string[]>>;
  handleCreateHr: () => void;
  hrActionLoading: boolean;
  selectedHrId: string | null;
  openHrInsights: (hr: CompanyHrUser) => void;
  handleDeleteHr: (hrId: string, email: string) => void;
  permissionDraft: string[];
  setPermissionDraft: React.Dispatch<React.SetStateAction<string[]>>;
  moduleDraft: string[];
  setModuleDraft: React.Dispatch<React.SetStateAction<string[]>>;
  handleSaveHrPermissions: (hrId: string) => void;
};

export function CompanyTeamRecruitersView({
  canManageRecruiters,
  isCeoOrOwner,
  hrInsights,
  hrForm,
  setHrForm,
  hrFormPermissions,
  setHrFormPermissions,
  hrFormModules,
  setHrFormModules,
  handleCreateHr,
  hrActionLoading,
  selectedHrId,
  openHrInsights,
  handleDeleteHr,
  permissionDraft,
  setPermissionDraft,
  moduleDraft,
  setModuleDraft,
  handleSaveHrPermissions
}: CompanyTeamRecruitersViewProps) {
  return (
    <div className={companyDashboardStyles.pageStack}>
      <CompanyDashboardPageIntro title="HR Management" subtitle="CEO controls: create HR accounts, permissions, performance insights, and removal." />
      {!canManageRecruiters || !isCeoOrOwner ? (
        <EmptyState
          icon={ShieldAlert}
          title="Restricted to CEO / Company Admin"
          description="HR management is only available to company owner and CEO accounts."
        />
      ) : (
        <div className="space-y-6">
          {hrInsights && (
            <div className="stat-grid">
              <InfoTile icon={Users} label="HR Users" value={<span className="ds-stat-value">{hrInsights.summary.totalHrUsers}</span>} />
              <InfoTile icon={UserPlus} label="Assigned Candidates" value={<span className="ds-stat-value">{hrInsights.summary.totalAssignedCandidates}</span>} />
              <InfoTile
                icon={Award}
                label="Total Hires"
                value={<span className="ds-stat-value text-[var(--ds-primary-text)]">{hrInsights.summary.totalHires}</span>}
                className="ring-1 ring-[color-mix(in_srgb,var(--ds-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--ds-primary)_5%,transparent)]"
              />
              <InfoTile icon={Percent} label="Avg Conversion" value={<span className="ds-stat-value">{hrInsights.summary.averageConversionRate}%</span>} />
            </div>
          )}

          <Card title="Add HR User" titleIcon={UserPlus}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <input aria-label="Full name" className={field} placeholder="Full name" value={hrForm.name} onChange={(e) => setHrForm((p) => ({ ...p, name: e.target.value }))} />
                <input aria-label="Email" className={field} placeholder="Email" type="email" value={hrForm.email} onChange={(e) => setHrForm((p) => ({ ...p, email: e.target.value }))} />
                <input aria-label="Password (min 8 chars)" className={field} placeholder="Password (min 8 chars)" type="password" value={hrForm.password} onChange={(e) => setHrForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <p className="ds-label mb-2">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {HR_ASSIGNABLE_PERMISSIONS.map((perm) => (
                    <PermissionChip
                      key={perm}
                      label={perm}
                      checked={hrFormPermissions.includes(perm)}
                      onToggle={() =>
                        setHrFormPermissions((prev) =>
                          prev.includes(perm) ? prev.filter((p) => p !== perm) : [...new Set([...prev, perm])]
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="ds-label mb-2">Sidebar Modules</p>
                <SidebarModulePicker value={hrFormModules} onChange={setHrFormModules} />
              </div>

              <Button type="button" onClick={handleCreateHr} disabled={hrActionLoading}>
                {hrActionLoading ? "Saving..." : "Add HR"}
              </Button>
            </div>
          </Card>

          {!hrInsights || hrInsights.hrUsers.length === 0 ? (
            <EmptyState icon={Users} title="No HR accounts yet" description="Create an HR account above to start assigning candidates and tracking performance." />
          ) : (
            <div className="company-dashboard-list-stack">
              {hrInsights.hrUsers.map((hr) => {
                const expanded = selectedHrId === hr.id;
                return (
                  <CompanyDashboardItemCard key={hr.id} as="div">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <Avatar name={hr.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="ds-h3 truncate">{hr.name}</p>
                          <Badge tone={hr.isActive ? "success" : "neutral"} dot>
                            {hr.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="ds-caption truncate">{hr.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]">
                            {hr.assignedInternships} internships
                          </span>
                          <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]">
                            {hr.assignedCandidates} candidates
                          </span>
                          <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]">
                            {hr.performanceMetrics.hiredCandidates} hires
                          </span>
                          <span className="rounded-md bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--ds-muted)]">
                            {hr.performanceMetrics.conversionRate}% conversion
                          </span>
                        </div>
                        {hr.performanceMetrics.activitySummary && (
                          <p className="ds-caption mt-1.5 opacity-80">{hr.performanceMetrics.activitySummary}</p>
                        )}
                      </div>
                    </div>

                    <div className={companyDashboardStyles.actionsFooter}>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openHrInsights(hr)}
                        disabled={hrActionLoading}
                        aria-expanded={expanded}
                        aria-controls={`hr-insights-${hr.id}`}
                      >
                        <AppIcon icon={expanded ? ChevronUp : ChevronDown} size="xs" className="text-current" />
                        Insights
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleDeleteHr(hr.id, hr.email)} disabled={hrActionLoading}>
                        <AppIcon icon={Trash2} size="xs" className="text-current" />
                        Delete
                      </Button>
                    </div>

                    {expanded && (
                      <div id={`hr-insights-${hr.id}`} className="mt-4 space-y-4 border-t border-[var(--ds-border)] pt-4">
                        <div>
                          <p className="ds-label mb-2">Performance</p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <InfoTile label="Handled" value={hr.performanceMetrics.candidatesHandled} />
                            <InfoTile label="Shortlisted" value={hr.performanceMetrics.shortlistedCandidates} />
                            <InfoTile label="Interview Success" value={`${hr.performanceMetrics.interviewSuccessRate}%`} />
                          </div>
                        </div>

                        <div>
                          <p className="ds-label mb-2">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                            {HR_ASSIGNABLE_PERMISSIONS.map((perm) => (
                              <PermissionChip
                                key={`${hr.id}-${perm}`}
                                label={perm}
                                checked={permissionDraft.includes(perm)}
                                onToggle={() =>
                                  setPermissionDraft((prev) =>
                                    prev.includes(perm) ? prev.filter((p) => p !== perm) : [...new Set([...prev, perm])]
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="ds-label mb-2">Sidebar Modules</p>
                          <SidebarModulePicker value={moduleDraft} onChange={setModuleDraft} />
                        </div>

                        <Button type="button" onClick={() => handleSaveHrPermissions(hr.id)} disabled={hrActionLoading}>
                          {hrActionLoading ? "Saving..." : "Save Permissions"}
                        </Button>
                      </div>
                    )}
                  </CompanyDashboardItemCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

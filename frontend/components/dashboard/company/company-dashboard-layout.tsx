import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { cn } from "@/lib/utils";

export const companyDashboardStyles = {
  pageStack: "dashboard-stack company-dashboard-stack",
  mainGrid: "company-dashboard-grid",
  mainColumn: "company-dashboard-main",
  sidebarColumn: "company-dashboard-sidebar",
  section: "company-dashboard-section scroll-mt-6",
  sectionHeader: "company-dashboard-section-header",
  sectionContent: "company-dashboard-section-content",
  sectionActions: "company-dashboard-section-actions",
  panelCard: "company-dashboard-panel-card",
  itemCard: "company-dashboard-item-card",
  itemCardHighlight: "company-dashboard-item-card--highlight",
  cardGrid: "company-dashboard-card-grid",
  cardGridTwo: "company-dashboard-card-grid company-dashboard-card-grid--2",
  cardGridThree: "company-dashboard-card-grid company-dashboard-card-grid--3",
  listStack: "company-dashboard-list-stack",
  metricGrid: "company-dashboard-metric-grid",
  metricGridFour: "company-dashboard-metric-grid company-dashboard-metric-grid--4",
  metricGridFive: "company-dashboard-metric-grid company-dashboard-metric-grid--5",
  metricTile: "company-dashboard-metric-tile",
  actionsFooter: "company-dashboard-actions-footer",
  actionsRow: "company-dashboard-actions-row",
  paginationRow: "company-dashboard-pagination"
} as const;

type CompanyDashboardPageIntroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function CompanyDashboardPageIntro({ title, subtitle, eyebrow, actions, className }: CompanyDashboardPageIntroProps) {
  return <DashboardPageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} className={className} />;
}

type CompanyDashboardMainGridProps = {
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
};

export function CompanyDashboardMainGrid({ main, sidebar, className }: CompanyDashboardMainGridProps) {
  if (!sidebar) {
    return <div className={cn(companyDashboardStyles.mainColumn, className)}>{main}</div>;
  }

  return (
    <div className={cn(companyDashboardStyles.mainGrid, className)}>
      <div className={companyDashboardStyles.mainColumn}>{main}</div>
      <div className={companyDashboardStyles.sidebarColumn}>{sidebar}</div>
    </div>
  );
}

type CompanyDashboardSectionProps = {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  // Some callers embed this section directly under a page header that
  // already renders `title` as the page's <h1> -- repeating it here as an
  // <h2> is a literal duplicate heading. Set this when this section IS the
  // page (not one of several sections on a shared/tabbed view).
  hideTitle?: boolean;
};

export function CompanyDashboardSection({
  id,
  title,
  description,
  icon,
  actions,
  children,
  className,
  hideTitle = false
}: CompanyDashboardSectionProps) {
  return (
    <section
      id={id}
      className={cn(companyDashboardStyles.section, className)}
      aria-label={hideTitle ? title : undefined}
    >
      <div className={companyDashboardStyles.sectionHeader}>
        <div className="min-w-0">
          {hideTitle ? null : (
            <h2 className="ds-h2 flex items-center gap-2">
              {icon ? <AppIcon icon={icon} size="sm" className="shrink-0 text-[var(--ds-accent)]" /> : null}
              <span>{title}</span>
            </h2>
          )}
          {description ? <p className="ds-caption mt-1 max-w-2xl">{description}</p> : null}
        </div>
        {actions ? <div className={companyDashboardStyles.sectionActions}>{actions}</div> : null}
      </div>
      <div className={companyDashboardStyles.sectionContent}>{children}</div>
    </section>
  );
}

type CompanyDashboardPanelCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function CompanyDashboardPanelCard({ children, className }: CompanyDashboardPanelCardProps) {
  return <div className={cn(companyDashboardStyles.panelCard, className)}>{children}</div>;
}

type CompanyDashboardItemCardProps = {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
  as?: "article" | "div";
};

export function CompanyDashboardItemCard({
  children,
  className,
  highlighted = false,
  as: Component = "article"
}: CompanyDashboardItemCardProps) {
  return (
    <Component
      className={cn(
        companyDashboardStyles.itemCard,
        highlighted && companyDashboardStyles.itemCardHighlight,
        className
      )}
    >
      {children}
    </Component>
  );
}

type CompanyDashboardEmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  children?: React.ReactNode;
  className?: string;
};

export function CompanyDashboardEmptyState({
  title,
  description,
  icon,
  action,
  ctaLabel,
  ctaHref,
  onCtaClick,
  children,
  className
}: CompanyDashboardEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      action={action ?? children}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      onCtaClick={onCtaClick}
      className={className}
    />
  );
}

type CompanyDashboardMetricTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
};

export function CompanyDashboardMetricTile({ label, value, hint, className }: CompanyDashboardMetricTileProps) {
  return (
    <div className={cn(companyDashboardStyles.metricTile, className)}>
      <p className="ds-label">{label}</p>
      <p className="ds-stat-value mt-1">{value}</p>
      {hint ? <div className="ds-caption mt-1 space-y-0.5">{hint}</div> : null}
    </div>
  );
}

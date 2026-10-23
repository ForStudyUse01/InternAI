import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

type DashboardPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function DashboardPageHeader({ eyebrow, title, subtitle, actions, className }: DashboardPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ds-animate-in", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="ds-label">
            {eyebrow} · {BRAND_NAME}
          </p>
        )}
        <h2 className="ds-h1 mt-1">{title}</h2>
        {subtitle && <p className="ds-caption mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

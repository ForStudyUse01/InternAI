import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type CardProps = {
  title?: string;
  subtitle?: string;
  titleIcon?: LucideIcon;
  className?: string;
  interactive?: boolean;
  children: React.ReactNode;
};

export function Card({ title, subtitle, titleIcon, className, interactive = true, children }: CardProps) {
  return (
    <div className={cn("ds-card", interactive && "ds-surface--interactive", className)}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="ds-h3 flex items-center gap-2">
              {titleIcon ? <AppIcon icon={titleIcon} size="sm" className="text-[var(--ds-accent)]" /> : null}
              <span>{title}</span>
            </h3>
          )}
          {subtitle && <p className="ds-caption mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

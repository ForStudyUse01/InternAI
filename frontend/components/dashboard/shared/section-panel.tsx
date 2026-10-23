import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type SectionPanelProps = {
  id?: string;
  title: string;
  subtitle?: string;
  titleIcon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  // Set when this panel is embedded directly under a page header that
  // already renders `title` as the page's <h1> -- avoids a literal
  // duplicate heading (page <h1> + this panel's <h3>).
  hideTitle?: boolean;
};

export function SectionPanel({ id, title, subtitle, titleIcon, children, className, hideTitle = false }: SectionPanelProps) {
  return (
    <section id={id} aria-label={hideTitle ? title : undefined}>
      <Card
        title={hideTitle ? undefined : title}
        subtitle={subtitle}
        titleIcon={hideTitle ? undefined : titleIcon}
        className={className}
      >
        {children}
      </Card>
    </section>
  );
}

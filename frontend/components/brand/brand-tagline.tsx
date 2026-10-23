import { BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandTagline({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs font-medium text-slate-500 dark:text-slate-400", className)}>
      {BRAND_TAGLINE}
    </p>
  );
}

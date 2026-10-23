import { ChevronDown } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export function Select({ className, wrapperClassName, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select className={cn("ds-select appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <AppIcon icon={ChevronDown} size="sm" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}

import { Check, CheckCheck } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { cn } from "@/lib/utils";

type MessageStatus = "sent" | "delivered" | "read" | string;

export function MessageStatusIndicator({
  status,
  className
}: {
  status?: MessageStatus;
  className?: string;
}) {
  if (status === "read") {
    return <AppIcon icon={CheckCheck} size="xs" className={cn("text-[var(--ds-info)]", className)} aria-label="Read" />;
  }
  if (status === "delivered") {
    return <AppIcon icon={CheckCheck} size="xs" className={cn("opacity-80", className)} aria-label="Delivered" />;
  }
  return <AppIcon icon={Check} size="xs" className={cn("opacity-70", className)} aria-label="Sent" />;
}

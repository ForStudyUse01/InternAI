"use client";

import { ErrorState } from "@/components/errors/error-state";

type AccessDeniedProps = {
  title?: string;
  hint?: string;
  className?: string;
};

export function AccessDenied({
  title = "Access Denied",
  hint = "You don't have permission to view this module. Contact your Company Admin to request access.",
  className
}: AccessDeniedProps) {
  return (
    <ErrorState
      variant="403"
      size="inline"
      title={title}
      description={hint}
      className={className}
    />
  );
}

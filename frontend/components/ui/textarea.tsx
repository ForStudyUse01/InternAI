"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({
  label,
  error,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <label className="block w-full" htmlFor={textareaId}>
      {label && <span className="ds-input-label">{label}</span>}
      <textarea
        id={textareaId}
        className={cn("ds-textarea", error && "border-[rgba(248,113,113,0.45)]", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error && (
        <span id={errorId} className="ds-input-error">
          {error}
        </span>
      )}
    </label>
  );
}

"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  error,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <label className="block w-full" htmlFor={inputId}>
      {label && <span className="ds-input-label">{label}</span>}
      <input
        id={inputId}
        className={cn("ds-input", error && "border-[rgba(248,113,113,0.45)]", className)}
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

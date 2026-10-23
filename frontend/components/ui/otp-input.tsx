"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type OTPInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
};

export function OTPInput({
  value,
  onChange,
  onComplete,
  disabled,
  length = 6,
  autoFocus = true
}: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const completedRef = useRef("");

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (value.length === length && /^\d+$/.test(value) && completedRef.current !== value) {
      completedRef.current = value;
      onComplete?.(value);
    }
    if (value.length < length) {
      completedRef.current = "";
    }
  }, [value, length, onComplete]);

  const updateValue = useCallback(
    (next: string) => {
      onChange(next.replace(/\D/g, "").slice(0, length));
    },
    [length, onChange]
  );

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    while (chars.length < length) chars.push("");
    chars[index] = digit;
    updateValue(chars.join("").replace(/\s/g, ""));
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (!value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        return;
      }
      const chars = value.split("");
      chars[index] = "";
      updateValue(chars.join(""));
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    updateValue(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div>
      <span className="ds-input-label" id="otp-input-label">Enter OTP</span>
      <div className="flex gap-2" role="group" aria-labelledby="otp-input-label" onPaste={handlePaste}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={value[index] || ""}
            disabled={disabled}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={cn(
              "ds-input h-11 w-11 text-center text-lg font-semibold tracking-normal",
              disabled && "cursor-not-allowed opacity-70"
            )}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

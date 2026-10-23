import { getPasswordStrength } from "@/lib/validation";

type PasswordStrengthProps = {
  password: string;
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label } = getPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${
              segment <= score
                ? score <= 1
                  ? "bg-[var(--ds-danger)]"
                  : score <= 3
                    ? "bg-[var(--ds-warning)]"
                    : "bg-[var(--ds-success)]"
                : "bg-[var(--ds-border)]"
            }`}
          />
        ))}
      </div>
      <p role="status" aria-live="polite" className="text-xs text-[var(--ds-muted)]">Password strength: {label}</p>
    </div>
  );
}

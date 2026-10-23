"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiRequest } from "@/lib/api-client";
import { resolvePostLoginRedirect } from "@/lib/auth-routes";
import { setAuthSession, type AdminRole, type AuthRole } from "@/lib/session";
import { validateEmail } from "@/lib/validation";
import { AuthBrandHeader } from "@/components/brand/auth-brand-header";
import { AppIcon } from "@/components/icons/app-icon";
import { ShieldCheck } from "lucide-react";

export function AdminAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const validate = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!validateEmail(loginData.email)) nextErrors.email = "Enter a valid email";
    if (!loginData.password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [loginData.email, loginData.password]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validate()) return;

      try {
        setIsLoading(true);
        setFeedback(null);

        const response = await apiRequest<{
          message: string;
          token: string;
          refreshToken?: string;
          role: AuthRole;
          adminRole?: AdminRole | null;
          permissions?: string[];
        }>("/api/auth/admin/login", {
          method: "POST",
          body: JSON.stringify(loginData)
        });

        setAuthSession(response.role, response.token, {
          refreshToken: response.refreshToken,
          adminRole: response.adminRole || null,
          permissions: response.permissions || [],
          email: loginData.email.trim().toLowerCase()
        });
        setFeedback({ type: "success", message: response.message });
        router.push(resolvePostLoginRedirect("admin", searchParams.get("next")));
      } catch (error) {
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    },
    [loginData, router, searchParams, validate]
  );

  return (
    <Card className="animate-reveal">
      <AuthBrandHeader />
      <div className="mb-6 flex items-center gap-3">
        <span className="ds-stat-icon">
          <AppIcon icon={ShieldCheck} size="md" />
        </span>
        <div>
          <h1 className="ds-h1">Admin Console</h1>
          <p className="ds-caption mt-1">
            Secure access for platform administrators.
          </p>
        </div>
      </div>

      <p className="ds-caption mb-4">
        Not an admin? Use one of the role portals below.
      </p>
      <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link
          href="/auth/intern"
          className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
          data-cursor="link"
        >
          Intern login
        </Link>
        <Link
          href="/auth/company"
          className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
          data-cursor="link"
        >
          Company login
        </Link>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Admin Email"
          type="email"
          placeholder="admin@internai.com"
          value={loginData.email}
          onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
          error={errors.email}
        />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={loginData.password}
          onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
          error={errors.password}
        />
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            data-cursor="button"
            aria-pressed={showPassword}
            className="font-medium text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? "Hide Password" : "Show Password"}
          </button>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner /> Signing in
            </span>
          ) : (
            "Sign in to Admin Console"
          )}
        </Button>
      </form>
    </Card>
  );
}

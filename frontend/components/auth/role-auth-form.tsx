"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OTPInput } from "@/components/ui/otp-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { apiRequest, ApiRequestError } from "@/lib/api-client";
import { resolvePostLoginRedirect } from "@/lib/auth-routes";
import { clearAuthSession, setAuthSession } from "@/lib/session";
import { validateEmail, validateGST, validatePhone } from "@/lib/validation";
import { AuthBrandHeader } from "@/components/brand/auth-brand-header";

type FormMode = "signup" | "login";
export type AuthRole = "intern" | "company";

type InternSignupData = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

type CompanySignupData = {
  companyName: string;
  companyEmail: string;
  gst: string;
  contactName: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const initialInternData: InternSignupData = {
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: ""
};

const initialCompanyData: CompanySignupData = {
  companyName: "",
  companyEmail: "",
  gst: "",
  contactName: "",
  phone: "",
  password: "",
  confirmPassword: ""
};

const COMPANY_PROFILE_PLACEHOLDER = "Pending profile completion";

type InternLoginType = "intern1" | "intern2";

const INTERN_LOGIN_PRESETS: Record<
  InternLoginType,
  { title: string; description: string; email: string; password: string }
> = {
  intern1: {
    title: "Demo Intern 1",
    description: "Pre-seeded profile with resume data, applications, and recommendations.",
    email: "intern1@example.com",
    password: "Intern@123"
  },
  intern2: {
    title: "Demo Intern 2",
    description: "Alternate demo intern account for testing additional flows.",
    email: "intern2@example.com",
    password: "Intern@123"
  }
};

type CompanyLoginType = "hr" | "ceo";

const COMPANY_LOGIN_PRESETS: Record<
  CompanyLoginType,
  { title: string; description: string; email: string; password: string }
> = {
  hr: {
    title: "Company HR",
    description: "Manage applicants, interviews, and hiring pipeline for your organization.",
    email: "hr@novatech.example",
    password: ""
  },
  ceo: {
    title: "Company CEO",
    description: "Executive access to company verification, analytics, and hiring oversight.",
    email: "ceo@novatech.example",
    password: "CompanyCeo@123"
  }
};

const OTP_RESEND_DEFAULT_SECONDS = 60;

function useCountdown(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const startCountdown = useCallback((seconds: number) => {
    setSecondsLeft(Math.max(0, seconds));
  }, []);

  return { secondsLeft, startCountdown, canProceed: secondsLeft <= 0 };
}

function AuthPortalLinks({ role }: { role: AuthRole }) {
  return (
    <div className="mt-6 space-y-2 border-t border-[var(--ds-border)] pt-4 text-xs">
      <p className="ds-label">Other portals</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {role !== "intern" && (
          <Link href="/auth/intern" className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]" data-cursor="link">
            Intern login
          </Link>
        )}
        {role !== "company" && (
          <Link href="/auth/company" className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]" data-cursor="link">
            Company login
          </Link>
        )}
        <Link href="/auth/admin" className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]" data-cursor="link">
          Admin login
        </Link>
      </div>
    </div>
  );
}

export function RoleAuthForm({ role }: { role: AuthRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<FormMode>("signup");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [internData, setInternData] = useState<InternSignupData>(initialInternData);
  const [companyData, setCompanyData] = useState<CompanySignupData>(initialCompanyData);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const { secondsLeft: otpResendSeconds, startCountdown: startOtpResendCountdown, canProceed: canResendOtp } =
    useCountdown(0);
  const [resetOtpMode, setResetOtpMode] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [resetOtpSending, setResetOtpSending] = useState(false);
  const [resetOtpVerifying, setResetOtpVerifying] = useState(false);
  const {
    secondsLeft: resetResendSeconds,
    startCountdown: startResetResendCountdown,
    canProceed: canResendResetOtp
  } = useCountdown(0);
  const [newPassword, setNewPassword] = useState("");
  const [companyLoginType, setCompanyLoginType] = useState<CompanyLoginType>("hr");
  const [internLoginType, setInternLoginType] = useState<InternLoginType>("intern1");
  const [hrDemoPassword, setHrDemoPassword] = useState("");

  useEffect(() => {
    clearAuthSession();
  }, []);

  useEffect(() => {
    if (role !== "company") return;
    let cancelled = false;
    apiRequest<{ email: string; password: string }>("/api/auth/demo-credentials/hr")
      .then((current) => {
        if (!cancelled) setHrDemoPassword(current.password);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    startOtpResendCountdown(0);
  }, [internData.email, startOtpResendCountdown]);

  const handleSendInternOtp = useCallback(
    async (isResend = false) => {
      if (!validateEmail(internData.email)) {
        setFeedback({ type: "error", message: "Enter a valid email before sending OTP." });
        return;
      }

      try {
        setOtpSending(true);
        setFeedback(null);
        const response = await apiRequest<{ message: string; retryAfterSeconds?: number }>(
          "/api/auth/intern/send-otp",
          {
            method: "POST",
            body: JSON.stringify({ email: internData.email.trim().toLowerCase() })
          }
        );
        setOtpSent(true);
        setOtpVerified(false);
        setOtp("");
        startOtpResendCountdown(response.retryAfterSeconds ?? OTP_RESEND_DEFAULT_SECONDS);
        const message = isResend ? "OTP resent to your email." : "OTP sent to your email.";
        setFeedback({ type: "success", message });
      } catch (error) {
        if (error instanceof ApiRequestError && error.details?.retryAfterSeconds) {
          startOtpResendCountdown(Number(error.details.retryAfterSeconds));
        }
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setOtpSending(false);
      }
    },
    [internData.email, startOtpResendCountdown]
  );

  const handleVerifyInternOtp = useCallback(
    async (code?: string) => {
      const otpCode = (code ?? otp).trim();
      if (otpCode.length !== 6) {
        setFeedback({ type: "error", message: "Enter the 6-digit OTP." });
        return;
      }
      if (!validateEmail(internData.email)) {
        setFeedback({ type: "error", message: "Enter a valid email before verifying OTP." });
        return;
      }

      try {
        setOtpVerifying(true);
        setFeedback(null);
        const response = await apiRequest<{ message: string; verified?: boolean }>("/api/auth/intern/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email: internData.email.trim().toLowerCase(), otp: otpCode })
        });
        setOtpVerified(true);
        setFeedback({ type: "success", message: response.message || "Email verified. Complete signup now." });
      } catch (error) {
        setOtpVerified(false);
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setOtpVerifying(false);
      }
    },
    [internData.email, otp]
  );

  const handleSendPasswordResetOtp = useCallback(
    async (isResend = false) => {
      if (!validateEmail(loginData.email)) {
        setFeedback({ type: "error", message: "Enter a valid email first." });
        return;
      }

      try {
        setResetOtpSending(true);
        setFeedback(null);
        const response = await apiRequest<{ message: string; retryAfterSeconds?: number }>(
          "/api/auth/password/send-otp",
          {
            method: "POST",
            body: JSON.stringify({ email: loginData.email.trim().toLowerCase() })
          }
        );
        setResetOtpSent(true);
        setResetOtp("");
        startResetResendCountdown(response.retryAfterSeconds ?? OTP_RESEND_DEFAULT_SECONDS);
        const message = response.message || (isResend ? "Password reset OTP resent." : "Password reset OTP sent.");
        setFeedback({ type: "success", message });
      } catch (error) {
        if (error instanceof ApiRequestError && error.details?.retryAfterSeconds) {
          startResetResendCountdown(Number(error.details.retryAfterSeconds));
        }
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setResetOtpSending(false);
      }
    },
    [loginData.email, startResetResendCountdown]
  );

  const handleResetPassword = useCallback(async () => {
    if (!validateEmail(loginData.email)) {
      setFeedback({ type: "error", message: "Enter a valid email first." });
      return;
    }
    if (resetOtp.length !== 6) {
      setFeedback({ type: "error", message: "Enter the 6-digit OTP." });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    try {
      setResetOtpVerifying(true);
      setFeedback(null);
      await apiRequest("/api/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({
          email: loginData.email.trim().toLowerCase(),
          otp: resetOtp,
          newPassword
        })
      });
      setFeedback({ type: "success", message: "Password reset successful. You can now log in." });
      setResetOtpMode(false);
      setResetOtpSent(false);
      setResetOtp("");
      setNewPassword("");
    } catch (error) {
      setFeedback({ type: "error", message: (error as Error).message });
    } finally {
      setResetOtpVerifying(false);
    }
  }, [loginData.email, newPassword, resetOtp]);

  const roleTitle = useMemo(() => (role === "intern" ? "Intern Access" : "Company Access"), [role]);
  const roleCopy = useMemo(
    () =>
      role === "intern"
        ? "Sign up or log in as an intern to manage your profile, resume, and applications."
        : "Sign up or log in as a company to post internships and manage applicants.",
    [role]
  );

  const setModeWithReset = useCallback((nextMode: FormMode) => {
    setMode(nextMode);
    setErrors({});
    setFeedback(null);
  }, []);

  const applyCompanyLoginPreset = useCallback(
    (type: CompanyLoginType) => {
      const preset = COMPANY_LOGIN_PRESETS[type];
      const password = type === "hr" ? hrDemoPassword : preset.password;
      setCompanyLoginType(type);
      setLoginData({ email: preset.email, password });
      setErrors({});
      setFeedback(null);
    },
    [hrDemoPassword]
  );

  const applyInternLoginPreset = useCallback((type: InternLoginType) => {
    const preset = INTERN_LOGIN_PRESETS[type];
    setInternLoginType(type);
    setLoginData({ email: preset.email, password: preset.password });
    setErrors({});
    setFeedback(null);
  }, []);

  const validateLogin = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!validateEmail(loginData.email)) nextErrors.loginEmail = "Enter a valid email";
    if (!loginData.password) nextErrors.loginPassword = "Password is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [loginData.email, loginData.password]);

  const validateInternSignup = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!internData.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!validateEmail(internData.email)) nextErrors.email = "Enter a valid email";
    if (!validatePhone(internData.mobile)) nextErrors.mobile = "Enter a valid 10-digit mobile number";
    if (internData.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (internData.password !== internData.confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [internData]);

  const validateCompanySignup = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!companyData.companyName.trim()) nextErrors.companyName = "Company name is required";
    if (!validateEmail(companyData.companyEmail)) nextErrors.companyEmail = "Enter a valid company email";
    if (!validateGST(companyData.gst)) nextErrors.gst = "Enter a valid GSTIN";
    if (!companyData.contactName.trim()) nextErrors.contactName = "Contact person is required";
    if (!validatePhone(companyData.phone)) nextErrors.phone = "Enter a valid 10-digit mobile number";
    if (companyData.password.length < 8) nextErrors.companyPassword = "Password must be at least 8 characters";
    if (companyData.password !== companyData.confirmPassword) nextErrors.companyConfirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [companyData]);

  const handleLoginSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validateLogin()) return;

      try {
        setIsLoading(true);
        setFeedback(null);

        const endpoint = role === "intern" ? "/api/auth/intern/login" : "/api/auth/company/login";
        const response = await apiRequest<{
          message: string;
          token: string;
          refreshToken?: string;
          role: AuthRole;
          permissions?: string[];
          companyAccountType?: string;
        }>(endpoint, {
          method: "POST",
          body: JSON.stringify(loginData)
        });

        setAuthSession(response.role, response.token, {
          refreshToken: response.refreshToken,
          email: loginData.email.trim().toLowerCase(),
          permissions: response.permissions || [],
          companyAccountType: response.companyAccountType || null
        });
        setFeedback({ type: "success", message: response.message });
        router.push(resolvePostLoginRedirect(response.role, searchParams.get("next"), response.companyAccountType));
      } catch (error) {
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    },
    [loginData, role, router, searchParams, validateLogin]
  );

  const handleSignupSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const isValid = role === "intern" ? validateInternSignup() : validateCompanySignup();
      if (!isValid) return;

      try {
        setIsLoading(true);
        setFeedback(null);

        if (role === "intern") {
          if (!otpVerified) {
            setFeedback({ type: "error", message: "Please verify OTP before creating your account." });
            return;
          }
          const response = await apiRequest<{ message: string; token: string; refreshToken?: string; role: AuthRole }>(
            "/api/auth/intern/signup",
            {
              method: "POST",
              body: JSON.stringify({
                fullName: internData.fullName,
                email: internData.email,
                mobile: internData.mobile,
                password: internData.password
              })
            }
          );

          setAuthSession(response.role, response.token, {
            refreshToken: response.refreshToken,
            email: internData.email.trim().toLowerCase()
          });
          setFeedback({ type: "success", message: response.message });
          router.push(resolvePostLoginRedirect("intern", searchParams.get("next")));
          return;
        }

        const response = await apiRequest<{
          message: string;
          token: string;
          refreshToken?: string;
          role: AuthRole;
          companyAccountType?: string;
          verificationStatus: string;
        }>("/api/auth/company/signup", {
          method: "POST",
          body: JSON.stringify({
            companyName: companyData.companyName,
            companyEmail: companyData.companyEmail,
            gst: companyData.gst,
            contactName: companyData.contactName,
            phone: companyData.phone,
            website: "",
            address: COMPANY_PROFILE_PLACEHOLDER,
            description: COMPANY_PROFILE_PLACEHOLDER,
            password: companyData.password
          })
        });

        setAuthSession(response.role, response.token, {
          refreshToken: response.refreshToken,
          email: companyData.companyEmail.trim().toLowerCase(),
          companyAccountType: response.companyAccountType || null
        });
        setFeedback({ type: "success", message: response.message });
        router.push(resolvePostLoginRedirect(response.role, searchParams.get("next"), response.companyAccountType));
      } catch (error) {
        setFeedback({ type: "error", message: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    },
    [companyData, internData, otpVerified, role, router, searchParams, validateCompanySignup, validateInternSignup]
  );

  return (
    <Card className="animate-reveal">
      <AuthBrandHeader />
      <div className="mb-6">
        <h1 className="ds-h1">{roleTitle}</h1>
        <p className="mt-2 text-sm text-[var(--ds-text-secondary)]">{roleCopy}</p>
      </div>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-[var(--ds-surface)] p-1">
        <button
          type="button"
          onClick={() => setModeWithReset("signup")}
          data-cursor="button"
          aria-pressed={mode === "signup"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-[var(--ds-card)] text-[var(--ds-text)] shadow-soft"
              : "text-[var(--ds-muted)] hover:text-[var(--ds-text-secondary)]"
          }`}
        >
          Signup
        </button>
        <button
          type="button"
          onClick={() => {
            setModeWithReset("login");
            if (role === "intern") applyInternLoginPreset(internLoginType);
          }}
          data-cursor="button"
          aria-pressed={mode === "login"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            mode === "login"
              ? "bg-[var(--ds-card)] text-[var(--ds-text)] shadow-soft"
              : "text-[var(--ds-muted)] hover:text-[var(--ds-text-secondary)]"
          }`}
        >
          Login
        </button>
      </div>

      <p className="ds-caption mb-4">
        {role === "intern" ? "Looking for company access?" : "Looking for intern access?"}{" "}
        <Link
          href={role === "intern" ? "/auth/company" : "/auth/intern"}
          className="font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
          data-cursor="link"
        >
          Switch to {role === "intern" ? "Company" : "Intern"}
        </Link>
      </p>

      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {/* Both forms are noValidate: native constraint validation on
          type="email" aborts submit before our handler runs, so the user gets
          a transient browser tooltip and none of the form's own inline field
          errors. Our validators cover every field, so they stay the single
          source of truth. */}
      {mode === "login" ? (
        <form className="mt-5 space-y-4" onSubmit={handleLoginSubmit} noValidate>
          {role === "intern" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                Demo account
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(INTERN_LOGIN_PRESETS) as InternLoginType[]).map((type) => {
                  const preset = INTERN_LOGIN_PRESETS[type];
                  const active = internLoginType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      data-cursor="button"
                      aria-pressed={active}
                      onClick={() => applyInternLoginPreset(type)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-[var(--ds-primary)] bg-[var(--ds-info-bg)] shadow-soft"
                          : "border-[var(--ds-border)] bg-[var(--ds-card)] hover:border-[var(--ds-border-strong)]"
                      }`}
                    >
                      <p className="text-sm font-bold text-[var(--ds-text)]">{preset.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-muted)]">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2.5 text-xs text-[var(--ds-text-secondary)]">
                <p className="font-semibold text-[var(--ds-text)]">Demo credentials</p>
                <p className="mt-1">
                  Email: <span className="font-mono">{INTERN_LOGIN_PRESETS[internLoginType].email}</span>
                </p>
                <p>
                  Password: <span className="font-mono">{INTERN_LOGIN_PRESETS[internLoginType].password}</span>
                </p>
                <button
                  type="button"
                  className="mt-2 font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
                  onClick={() => applyInternLoginPreset(internLoginType)}
                >
                  Use these credentials
                </button>
              </div>
            </div>
          )}
          {role === "company" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                Company account type
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(COMPANY_LOGIN_PRESETS) as CompanyLoginType[]).map((type) => {
                  const preset = COMPANY_LOGIN_PRESETS[type];
                  const active = companyLoginType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      data-cursor="button"
                      aria-pressed={active}
                      onClick={() => applyCompanyLoginPreset(type)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-[var(--ds-primary)] bg-[var(--ds-info-bg)] shadow-soft"
                          : "border-[var(--ds-border)] bg-[var(--ds-card)] hover:border-[var(--ds-border-strong)]"
                      }`}
                    >
                      <p className="text-sm font-bold text-[var(--ds-text)]">{preset.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-muted)]">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2.5 text-xs text-[var(--ds-text-secondary)]">
                <p className="font-semibold text-[var(--ds-text)]">Demo credentials</p>
                <p className="mt-1">
                  Email: <span className="font-mono">{COMPANY_LOGIN_PRESETS[companyLoginType].email}</span>
                </p>
                <p>
                  Password:{" "}
                  <span className="font-mono">
                    {companyLoginType === "hr"
                      ? hrDemoPassword || "Loading..."
                      : COMPANY_LOGIN_PRESETS[companyLoginType].password}
                  </span>
                </p>
                <button
                  type="button"
                  className="mt-2 font-semibold text-[var(--ds-primary-text)] hover:text-[var(--ds-primary-hover)]"
                  onClick={() => applyCompanyLoginPreset(companyLoginType)}
                >
                  Use these credentials
                </button>
              </div>
            </div>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
            value={loginData.email}
            onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
            error={errors.loginEmail}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={loginData.password}
            onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
            error={errors.loginPassword}
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
            <button
              type="button"
              data-cursor="button"
              aria-expanded={resetOtpMode}
              aria-controls="reset-password-panel"
              className="text-[var(--ds-muted)] hover:text-[var(--ds-text-secondary)]"
              onClick={() => setResetOtpMode((prev) => !prev)}
            >
              Forgot password?
            </button>
          </div>
          {resetOtpMode && (
            <div id="reset-password-panel" className="space-y-2 rounded-xl border border-[var(--ds-border)] p-3">
              {!resetOtpSent ? (
                <Button type="button" size="sm" disabled={resetOtpSending} onClick={() => handleSendPasswordResetOtp(false)}>
                  {resetOtpSending ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner /> Sending OTP
                    </span>
                  ) : (
                    "Send Reset OTP"
                  )}
                </Button>
              ) : (
                <>
                  <OTPInput
                    value={resetOtp}
                    onChange={setResetOtp}
                    disabled={resetOtpVerifying}
                    onComplete={() => undefined}
                  />
                  <Input
                    label="New Password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={resetOtpVerifying} onClick={() => handleResetPassword()}>
                      {resetOtpVerifying ? (
                        <span className="inline-flex items-center gap-2">
                          <LoadingSpinner /> Resetting
                        </span>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!canResendResetOtp || resetOtpSending}
                      onClick={() => handleSendPasswordResetOtp(true)}
                    >
                      {canResendResetOtp
                        ? resetOtpSending
                          ? "Resending..."
                          : "Resend OTP"
                        : `Resend in ${resetResendSeconds}s`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner /> Logging in
              </span>
            ) : role === "company" ? (
              `Login as ${COMPANY_LOGIN_PRESETS[companyLoginType].title}`
            ) : (
              `Login as ${INTERN_LOGIN_PRESETS[internLoginType].title}`
            )}
          </Button>
        </form>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleSignupSubmit} noValidate>
          {role === "intern" ? (
            <>
              <Input
                label="Full Name"
                placeholder="Enter full name"
                value={internData.fullName}
                onChange={(event) => setInternData((prev) => ({ ...prev, fullName: event.target.value }))}
                error={errors.fullName}
              />
              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                value={internData.email}
                onChange={(event) => setInternData((prev) => ({ ...prev, email: event.target.value }))}
                error={errors.email}
              />
              <Input
                label="Mobile"
                placeholder="10-digit mobile number"
                value={internData.mobile}
                onChange={(event) => setInternData((prev) => ({ ...prev, mobile: event.target.value.replace(/\D/g, "") }))}
                error={errors.mobile}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={internData.password}
                onChange={(event) => setInternData((prev) => ({ ...prev, password: event.target.value }))}
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={internData.confirmPassword}
                onChange={(event) => setInternData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                error={errors.confirmPassword}
              />
              <div className="rounded-xl border border-[var(--ds-border)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-muted)]">Email Verification OTP</p>
                {!otpSent ? (
                  <Button type="button" size="sm" disabled={otpSending} onClick={() => handleSendInternOtp(false)}>
                    {otpSending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner /> Sending OTP
                      </span>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <OTPInput
                      value={otp}
                      onChange={setOtp}
                      disabled={otpVerified || otpVerifying}
                      onComplete={(code) => {
                        if (!otpVerified && !otpVerifying) {
                          void handleVerifyInternOtp(code);
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={otpVerified || otpVerifying}
                        onClick={() => handleVerifyInternOtp()}
                      >
                        {otpVerifying ? (
                          <span className="inline-flex items-center gap-2">
                            <LoadingSpinner /> Verifying
                          </span>
                        ) : otpVerified ? (
                          "OTP Verified"
                        ) : (
                          "Verify OTP"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={otpVerified || !canResendOtp || otpSending}
                        onClick={() => handleSendInternOtp(true)}
                      >
                        {canResendOtp
                          ? otpSending
                            ? "Resending..."
                            : "Resend OTP"
                          : `Resend in ${otpResendSeconds}s`}
                      </Button>
                    </div>
                    {otpVerified && (
                      <p className="text-xs font-medium text-[var(--ds-success)]">
                        Email verified. You can create your account now.
                      </p>
                    )}
                  </div>
                )}
              </div>
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
              <PasswordStrength password={internData.password} />
            </>
          ) : (
            <>
              <Input
                label="Company Name"
                placeholder="Enter company name"
                value={companyData.companyName}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, companyName: event.target.value }))}
                error={errors.companyName}
              />
              <Input
                label="Official Email"
                type="email"
                placeholder="hr@company.com"
                value={companyData.companyEmail}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, companyEmail: event.target.value }))}
                error={errors.companyEmail}
              />
              <Input
                label="GSTIN"
                placeholder="22AAAAA0000A1Z5"
                value={companyData.gst}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, gst: event.target.value.toUpperCase() }))}
                error={errors.gst}
              />
              <Input
                label="Contact Person"
                placeholder="Hiring manager name"
                value={companyData.contactName}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, contactName: event.target.value }))}
                error={errors.contactName}
              />
              <Input
                label="Phone"
                placeholder="10-digit mobile number"
                value={companyData.phone}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "") }))}
                error={errors.phone}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={companyData.password}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, password: event.target.value }))}
                error={errors.companyPassword}
              />
              <Input
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={companyData.confirmPassword}
                onChange={(event) => setCompanyData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                error={errors.companyConfirmPassword}
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
              <PasswordStrength password={companyData.password} />

              <p className="rounded-xl border border-[var(--ds-warning)]/40 bg-[var(--ds-warning-bg)] px-3 py-2 text-xs text-[var(--ds-warning)]">
                Verification info: Company accounts are reviewed before posting internships.
              </p>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner /> Creating account
              </span>
            ) : role === "intern" ? (
              "Create Intern Account"
            ) : (
              "Create Company Account"
            )}
          </Button>
        </form>
      )}

      <AuthPortalLinks role={role} />
    </Card>
  );
}


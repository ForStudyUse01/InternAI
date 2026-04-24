import { motion, useReducedMotion, useMotionValue, useTransform, useSpring, useMotionTemplate, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useRef, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api/client";
import { ErrorState } from "@/components/common/ErrorState";
import { GlassCard } from "@/components/ui/GlassCard";
import { InputField } from "@/components/ui/InputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DancingStudent } from "@/components/ui/DancingStudent";
import { BusinessCat } from "@/components/ui/BusinessCat";

const ease = [0.22, 1, 0.36, 1] as const;
const springConfig = { stiffness: 250, damping: 25, mass: 0.5 };

export function SignupPage() {
  const reduce = useReducedMotion();
  const [role, setRole] = useState<"intern" | "company">("intern");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);
  const glowX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);

  function handleMouseMove(e: MouseEvent) {
    if (reduce || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = role === "intern" ? "/auth/signup/intern" : "/auth/signup/company";
      const payload =
        role === "intern"
          ? { fullName: name, email, mobileNumber, password, confirmPassword }
          : { companyName: name, officialEmail: email, mobileNumber, password, confirmPassword };

      await apiClient.post(endpoint, payload);
      setSignupDone(true);
      setIdentifier(email);
      setMessage("Signup successful. Enter the OTP sent to your email to verify.");
      toast.success("Account created. Verify your email with the OTP.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/verification/verify-otp", { identifier, otp });
      setMessage("OTP verified successfully. You can now login.");
      toast.success("Email verified. You can sign in.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-6" style={{ perspective: "1200px" }}>
      <div className="flex w-full max-w-5xl items-center justify-center gap-12 px-4">
      {/* Floating ambient particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + i * 2,
              height: 4 + i * 2,
              background: i % 2 === 0 ? "#00FF88" : "#00E0FF",
              opacity: 0.15 + (i % 3) * 0.05,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30 - i * 10, 0],
              x: [0, (i % 2 === 0 ? 15 : -15), 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              repeat: Infinity,
              duration: 4 + i * 0.8,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <motion.div
        ref={cardRef}
        className="relative w-full max-w-md"
        initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 40, rotateX: reduce ? 0 : 20, scale: reduce ? 1 : 0.92 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Animated glow border that follows mouse */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[25px]"
          style={{
            background: useMotionTemplate`radial-gradient(400px circle at ${glowX}% ${glowY}%, rgba(0,255,136,0.15), transparent 70%)`,
            opacity: 0.6,
          }}
        />

        <GlassCard className="relative overflow-hidden p-8 sm:p-9 transition-shadow duration-300 hover:shadow-[0_30px_60px_rgba(0,255,136,0.15)]">
          {/* Inner highlight shimmer */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00FF88]/5 via-transparent to-[#00E0FF]/5"
            style={{ transform: "translateZ(20px)" }}
          />

          <div className="relative" style={{ transform: "translateZ(30px)" }}>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Create your account</h1>
            <p className="mb-8 text-sm text-white/55">Intern or company—same smooth onboarding.</p>
            <form className="space-y-5" onSubmit={handleSignup}>
              <div className="space-y-1.5">
                <label htmlFor="signup-role" className="block text-sm font-medium text-white/85">
                  Role
                </label>
                <select
                  id="signup-role"
                  className="field-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "intern" | "company")}
                >
                  <option value="intern">Intern</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <InputField
                id="signup-name"
                label={role === "intern" ? "Full name" : "Company name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <InputField
                id="signup-email"
                label={role === "intern" ? "Email" : "Official email"}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <InputField
                id="signup-mobile"
                label="Mobile number"
                type="tel"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
              />
              <InputField
                id="signup-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <InputField
                id="signup-confirm"
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-password"
                  className="h-4 w-4 cursor-pointer rounded-sm border-white/20 bg-white/5 text-[#00FF88] focus:ring-[#00FF88]/50 outline-none"
                  checked={showPassword}
                  onChange={() => setShowPassword((prev) => !prev)}
                />
                <label htmlFor="show-password" className="cursor-pointer text-sm font-medium text-white/55 transition-colors hover:text-white/85">
                  Show password
                </label>
              </div>
              {error ? <ErrorState message={error} /> : null}
              {message ? <p className="rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-3 py-2 text-sm text-[#00FF88]">{message}</p> : null}
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </PrimaryButton>
            </form>

            {signupDone ? (
              <motion.form
                className="mt-8 space-y-4 border-t border-white/10 pt-8"
                onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.5, ease }}
              >
                <h2 className="text-lg font-semibold text-white">Verify OTP</h2>
                <p className="text-sm text-white/55">Enter the code we sent to your email.</p>
                <InputField
                  id="signup-identifier"
                  label="Email (identifier)"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <InputField id="signup-otp" label="One-time password" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                <PrimaryButton type="submit" variant="secondary" disabled={loading}>
                  {loading ? "Verifying…" : "Verify OTP"}
                </PrimaryButton>
              </motion.form>
            ) : null}

            <p className="mt-6 text-center text-sm text-white/45">
              Already have an account?{" "}
              <Link to="/auth/login" className="font-medium text-[#00FF88] transition-colors hover:text-[#00E0FF] hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]">
                Sign in
              </Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>

        {/* Role-based avatar */}
        <AnimatePresence mode="wait">
          {role === "intern" ? (
            <motion.div
              key="dancing-student"
              className="hidden lg:flex items-center justify-center flex-shrink-0"
            >
              <DancingStudent />
            </motion.div>
          ) : (
            <motion.div
              key="business-cat"
              className="hidden lg:flex items-center justify-center flex-shrink-0"
            >
              <BusinessCat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

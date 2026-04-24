import { motion, useReducedMotion, useMotionValue, useTransform, useSpring, useMotionTemplate, AnimatePresence } from "framer-motion";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/common/ErrorState";
import { GlassCard } from "@/components/ui/GlassCard";
import { InputField } from "@/components/ui/InputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DancingStudent } from "@/components/ui/DancingStudent";
import { BusinessCat } from "@/components/ui/BusinessCat";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: "intern" | "company";
    isVerified: boolean;
  };
}

const ease = [0.22, 1, 0.36, 1] as const;
const springConfig = { stiffness: 250, damping: 25, mass: 0.5 };

export function LoginPage() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const reduce = useReducedMotion();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"intern" | "company">("intern");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);
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

  if (token && user) {
    return <Navigate to={user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = identifier.includes("@") ? { email: identifier, password } : { mobileNumber: identifier, password };
      const response = await apiClient.post<LoginResponse>("/auth/login", payload);
      if (!response.data) {
        throw new Error("Something went wrong.");
      }

      login(response.data);
      toast.success("Signed in successfully");
      navigate(from ?? (response.data.user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
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
          className="pointer-events-none absolute -inset-px rounded-[25px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="mb-8 text-sm text-white/55">Sign in with your email or mobile number and password.</p>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="login-role" className="block text-sm font-medium text-white/85">
                  Role
                </label>
                <select
                  id="login-role"
                  className="field-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value as "intern" | "company")}
                >
                  <option value="intern">Intern</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <InputField
                id="login-identifier"
                label="Email or mobile"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@example.com or +91…"
                required
              />
              <InputField
                id="login-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </PrimaryButton>
            </form>
            <p className="mt-6 text-center text-sm text-white/45">
              No account?{" "}
              <Link to="/auth/signup" className="font-medium text-[#00FF88] transition-colors hover:text-[#00E0FF] hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]">
                Create one
              </Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>

        <AnimatePresence mode="wait">
          {role === "intern" ? (
            <motion.div
              key="login-dancing-student"
              className="hidden lg:flex items-center justify-center flex-shrink-0"
              initial={{ opacity: 0, x: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.8 }}
              transition={{ duration: 0.5, ease }}
            >
              <DancingStudent />
            </motion.div>
          ) : (
            <motion.div
              key="login-business-cat"
              className="hidden lg:flex items-center justify-center flex-shrink-0"
              initial={{ opacity: 0, x: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.8 }}
              transition={{ duration: 0.5, ease }}
            >
              <BusinessCat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

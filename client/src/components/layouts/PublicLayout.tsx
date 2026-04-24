import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/constants";

const ease = [0.22, 1, 0.36, 1] as const;

function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease }}
    >
      {children}
    </motion.div>
  );
}

export function PublicLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  if (isHomePage) {
    return (
      <div className="min-h-screen bg-black text-gray-300 antialiased">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-gray-300 antialiased">
      <AnimatedBackground />
      <header className="sticky top-0 z-20 border-b border-gray-700/80 bg-app-bg/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-xl font-bold text-transparent transition-opacity hover:opacity-80"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-400">
            {!user && (
              <>
                <Link to="/auth/login" className="transition-colors hover:text-white">
                  Login
                </Link>
                <Link to="/auth/signup" className="transition-colors hover:text-white">
                  Signup
                </Link>
              </>
            )}
            {user && (
              <>
                <Link
                  to={user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"}
                  className="transition-colors hover:text-white"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-gray-600 bg-app-card/60 px-3 py-1.5 text-gray-200 shadow-sm transition-colors hover:border-gray-500 hover:bg-app-card/90"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

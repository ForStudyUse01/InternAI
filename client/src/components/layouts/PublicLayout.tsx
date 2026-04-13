import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/constants";

export function PublicLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {!user && (
              <>
                <Link to="/auth/login" className="hover:text-blue-600">
                  Login
                </Link>
                <Link to="/auth/signup" className="hover:text-blue-600">
                  Signup
                </Link>
              </>
            )}
            {user && (
              <>
                <Link to={user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"} className="hover:text-blue-600">
                  Dashboard
                </Link>
                <button type="button" onClick={logout} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100">
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/common";

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"} replace />;
  }

  return <Outlet />;
}

import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/common/HomePage";
import { NotFoundPage } from "@/pages/common/NotFoundPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { InternDashboardPage } from "@/pages/intern/DashboardPage";
import { CompanyDashboardPage } from "@/pages/company/DashboardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "auth/login", element: <LoginPage /> },
      { path: "auth/signup", element: <SignupPage /> },
      {
        element: <ProtectedRoute role="intern" />,
        children: [{ path: "intern/dashboard", element: <InternDashboardPage /> }],
      },
      {
        element: <ProtectedRoute role="company" />,
        children: [{ path: "company/dashboard", element: <CompanyDashboardPage /> }],
      },
      { path: "404", element: <NotFoundPage /> },
      { path: "*", element: <Navigate to="/404" replace /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

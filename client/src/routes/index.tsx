import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NotFoundPage } from "@/pages/common/NotFoundPage";

const HomePage = lazy(async () => {
  const m = await import("@/pages/common/HomePage");
  return { default: m.HomePage };
});

function HomePageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" aria-label="Loading page">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
    </div>
  );
}

import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { InternDashboardPage } from "@/pages/intern/DashboardPage";
import { CompanyDashboardPage } from "@/pages/company/DashboardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<HomePageFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
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

"use client";

import { Suspense } from "react";
import { AuthSessionRedirect } from "@/components/auth/auth-session-redirect";
import { PlatformLayout } from "@/components/layout/platform-layout";
import { usePathname } from "next/navigation";
import type { AuthRole } from "@/lib/session";

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const role: AuthRole = pathname.includes("/auth/company")
    ? "company"
    : pathname.includes("/auth/admin")
      ? "admin"
      : "intern";

  return <AuthSessionRedirect expectedRole={role}>{children}</AuthSessionRedirect>;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformLayout>
      <Suspense
        fallback={
          <section className="container-shell ds-page-section">
            <div className="ds-card ds-animate-in p-6 text-sm text-[var(--ds-muted)]">Loading...</div>
          </section>
        }
      >
        <AuthLayoutInner>{children}</AuthLayoutInner>
      </Suspense>
    </PlatformLayout>
  );
}

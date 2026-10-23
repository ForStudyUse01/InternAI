import type { Metadata } from "next";
import { PlatformLayout } from "@/components/layout/platform-layout";
import { DashboardErrorBoundary } from "@/components/ui/dashboard-error-boundary";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s" },
  robots: { index: false, follow: false }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary>
      <PlatformLayout>
        <div className="min-h-screen">{children}</div>
      </PlatformLayout>
    </DashboardErrorBoundary>
  );
}

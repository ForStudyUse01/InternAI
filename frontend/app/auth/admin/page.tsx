import type { Metadata } from "next";
import { AdminAuthForm } from "@/components/auth/admin-auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Administrator sign-in for InternAI.",
  robots: { index: false, follow: true }
};

export default function AdminAuthPage() {
  return (
    <AuthPageShell>
      <AdminAuthForm />
    </AuthPageShell>
  );
}

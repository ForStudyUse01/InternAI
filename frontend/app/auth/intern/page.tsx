import type { Metadata } from "next";
import { RoleAuthForm } from "@/components/auth/role-auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";

export const metadata: Metadata = {
  title: "Student Login & Sign Up",
  description: "Sign in or create a student account on InternAI to find and apply for internships.",
  robots: { index: false, follow: true }
};

export default function InternAuthPage() {
  return (
    <AuthPageShell>
      <RoleAuthForm role="intern" />
    </AuthPageShell>
  );
}

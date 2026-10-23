import type { Metadata } from "next";
import { RoleAuthForm } from "@/components/auth/role-auth-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";

export const metadata: Metadata = {
  title: "Company Login & Sign Up",
  description: "Sign in or create a company account on InternAI to post internships and hire interns.",
  robots: { index: false, follow: true }
};

export default function CompanyAuthPage() {
  return (
    <AuthPageShell>
      <RoleAuthForm role="company" />
    </AuthPageShell>
  );
}

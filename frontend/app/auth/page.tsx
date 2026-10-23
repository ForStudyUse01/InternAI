import { redirect } from "next/navigation";

type AuthSearchParams = {
  role?: string | string[];
};

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  const params = await searchParams;
  const rawRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const normalizedRole = rawRole === "company" ? "company" : rawRole === "admin" ? "admin" : "intern";

  redirect(`/auth/${normalizedRole}`);
}

import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/common/ErrorState";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: "intern" | "company";
    isVerified: boolean;
  };
}

export function LoginPage() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token && user) {
    return <Navigate to={user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = identifier.includes("@") ? { email: identifier, password } : { mobileNumber: identifier, password };
      const response = await apiClient.post<LoginResponse>("/auth/login", payload);
      if (!response.data) {
        throw new Error("Login failed");
      }

      login(response.data);
      toast.success("Signed in successfully");
      navigate(from ?? (response.data.user.role === "intern" ? "/intern/dashboard" : "/company/dashboard"), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block">Email or Mobile</span>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">Password</span>
          <input
            type="password"
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <ErrorState message={error} />}
        <button disabled={loading} className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60" type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}

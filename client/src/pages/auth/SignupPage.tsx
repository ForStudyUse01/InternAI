import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api/client";
import { ErrorState } from "@/components/common/ErrorState";

export function SignupPage() {
  const [role, setRole] = useState<"intern" | "company">("intern");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = role === "intern" ? "/auth/signup/intern" : "/auth/signup/company";
      const payload =
        role === "intern"
          ? { fullName: name, email, mobileNumber, password, confirmPassword }
          : { companyName: name, officialEmail: email, mobileNumber, password, confirmPassword };

      await apiClient.post(endpoint, payload);
      setSignupDone(true);
      setIdentifier(email);
      setMessage("Signup successful. Enter the OTP sent to your email to verify.");
      toast.success("Account created. Verify your email with the OTP.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/verification/verify-otp", { identifier, otp });
      setMessage("OTP verified successfully. You can now login.");
      toast.success("Email verified. You can sign in.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "OTP verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Signup</h1>
      <form className="space-y-4" onSubmit={handleSignup}>
        <label className="block text-sm">
          <span className="mb-1 block">Role</span>
          <select className="w-full rounded border border-slate-300 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as "intern" | "company")}>
            <option value="intern">Intern</option>
            <option value="company">Company</option>
          </select>
        </label>
        <input className="w-full rounded border border-slate-300 px-3 py-2" placeholder={role === "intern" ? "Full name" : "Company name"} value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="w-full rounded border border-slate-300 px-3 py-2" placeholder={role === "intern" ? "Email" : "Official email"} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border border-slate-300 px-3 py-2" placeholder="Mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
        <input type="password" className="w-full rounded border border-slate-300 px-3 py-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="password" className="w-full rounded border border-slate-300 px-3 py-2" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        {error && <ErrorState message={error} />}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60" type="submit">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {signupDone && (
        <form className="mt-6 space-y-3 border-t border-slate-200 pt-4" onSubmit={handleVerifyOtp}>
          <h2 className="font-medium">Verify OTP</h2>
          <input className="w-full rounded border border-slate-300 px-3 py-2" placeholder="Identifier (email)" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <input className="w-full rounded border border-slate-300 px-3 py-2" placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          <button disabled={loading} className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60" type="submit">
            Verify OTP
          </button>
        </form>
      )}
    </section>
  );
}

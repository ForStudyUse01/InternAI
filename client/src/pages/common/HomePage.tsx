import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";

export function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{APP_NAME}</h1>
      <p className="max-w-2xl text-slate-600">
        Build your career path with resume intelligence, deterministic internship matching, and structured application tracking.
      </p>
      <div className="flex gap-3">
        <Link className="rounded bg-blue-600 px-4 py-2 text-white" to="/auth/signup">
          Get Started
        </Link>
        <Link className="rounded border border-slate-300 px-4 py-2" to="/auth/login">
          Login
        </Link>
      </div>
    </section>
  );
}

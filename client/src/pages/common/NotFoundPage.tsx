import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="space-y-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="text-gray-400">The page you requested does not exist.</p>
      <Link to="/" className="inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300">
        Back to home
      </Link>
    </section>
  );
}

"use client";

import { ErrorState } from "@/components/errors/error-state";
import "./theme-tokens.generated.css";
import "./globals.css";

/** Last-resort boundary — replaces the root layout entirely, so it must render
 *  its own <html>/<body> and pull in the token stylesheets itself. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // eslint-disable-next-line no-console
  console.error(error);

  return (
    <html lang="en" className="dark">
      <body className="internai-platform bg-[var(--ds-bg)] font-sans text-[var(--ds-text,#e5e7eb)] antialiased">
        <main className="flex min-h-screen items-center justify-center px-6">
          <ErrorState
            variant="500"
            size="page"
            onRetry={reset}
            secondaryCta={{ label: "Go Home", href: "/" }}
          />
        </main>
      </body>
    </html>
  );
}

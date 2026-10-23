"use client";

import { PlatformLayout } from "@/components/layout/platform-layout";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

type ErrorPageShellProps = {
  children: React.ReactNode;
};

/** Full-page chrome for standalone error routes: navbar + centered content + footer,
 *  with the subtle grid/glow backdrop used across the platform. */
export function ErrorPageShell({ children }: ErrorPageShellProps) {
  return (
    <PlatformLayout>
      <main id="main-content" tabIndex={-1} className="relative flex min-h-screen flex-col overflow-hidden focus:outline-none">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="grid-pattern absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]" />
          <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--ds-primary)] opacity-[0.06] blur-3xl" />
          <div className="absolute bottom-16 right-[12%] h-56 w-56 rounded-full bg-[var(--ds-accent)] opacity-[0.05] blur-3xl" />
        </div>
        <Navbar theme="dark" />
        <section className="container-shell relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col items-center justify-center pt-8 pb-14">
          {children}
        </section>
        <Footer theme="dark" />
      </main>
    </PlatformLayout>
  );
}

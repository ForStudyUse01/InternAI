import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

type AuthPageShellProps = {
  children: React.ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen focus:outline-none">
      <Navbar theme="dark" />
      <section className="container-shell ds-page-section">
        <div className="mx-auto max-w-2xl ds-animate-in">{children}</div>
      </section>
      <Footer theme="dark" />
    </main>
  );
}

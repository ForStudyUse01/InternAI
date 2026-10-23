"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { InternAILogo } from "@/components/brand/internai-logo";
import { AppIcon } from "@/components/icons/app-icon";
import { getDashboardPathForRole, getProfilePathForRole } from "@/lib/auth-routes";
import { logoutAuthSession } from "@/lib/api-client";
import { useAuthSession } from "@/lib/use-auth-session";

const HOMEPAGE_SECTION_LINKS = [
  { hash: "hero", label: "Home" },
  { hash: "how-it-works", label: "How it works" },
  { hash: "capabilities", label: "Capabilities" }
] as const;

const HOMEPAGE_AUTH_LINKS = [
  { href: "/auth/intern", label: "Intern Login" },
  { href: "/auth/company", label: "Company Login" }
] as const;

type NavbarProps = {
  theme?: "light" | "dark";
};

function homepageSectionHref(hash: string, onHome: boolean) {
  return onHome ? `#${hash}` : `/#${hash}`;
}

function scrollToSection(hash: string) {
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Navbar({ theme = "light" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#hero");
  const { loggedIn, role } = useAuthSession();
  void theme;
  const isHome = pathname === "/";
  const isAuthPage = pathname.startsWith("/auth");

  const dashboardHref = role ? getDashboardPathForRole(role) : "/";
  const profileHref = role ? getProfilePathForRole(role) : "/";

  const handleLogout = async () => {
    await logoutAuthSession();
    setMobileOpen(false);
    router.push("/");
  };

  const linkClass = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-semibold transition duration-200",
      active
        ? "bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]"
        : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      "block rounded-xl px-3 py-2.5 text-sm font-semibold transition",
      active
        ? "bg-[var(--ds-surface-raised)] text-[var(--ds-accent)]"
        : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
    );

  const scrollHashOnLoad = useCallback(() => {
    if (!isHome || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    requestAnimationFrame(() => scrollToSection(hash));
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;

    const syncHash = () => {
      setActiveHash(window.location.hash || "#hero");
    };

    syncHash();
    scrollHashOnLoad();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [isHome, scrollHashOnLoad, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const handleHomepageSectionClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    hash: string
  ) => {
    setMobileOpen(false);
    if (!isHome) return;

    event.preventDefault();
    const target = `#${hash}`;
    scrollToSection(target);
    window.history.pushState(null, "", target);
    setActiveHash(target);
  };

  const isSectionActive = (hash: string) =>
    isHome && (activeHash === `#${hash}` || (hash === "hero" && activeHash === "#hero"));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ds-border)] bg-[var(--ds-navbar)] backdrop-blur-xl transition-colors duration-300">
      <nav className="container-shell flex h-16 items-center justify-between gap-3">
        {isAuthPage ? (
          <span className="inline-block h-[34px] w-[34px] shrink-0" aria-hidden />
        ) : (
          <InternAILogo href="/" />
        )}

        <div className="hidden items-center gap-2 md:flex">
          {isHome ? (
            <>
              {HOMEPAGE_SECTION_LINKS.map((link) => (
                <Link
                  key={link.hash}
                  href={homepageSectionHref(link.hash, true)}
                  className={linkClass(isSectionActive(link.hash))}
                  onClick={(event) => handleHomepageSectionClick(event, link.hash)}
                >
                  {link.label}
                </Link>
              ))}
              {HOMEPAGE_AUTH_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(false)}>
                  {link.label}
                </Link>
              ))}
            </>
          ) : loggedIn && role ? (
            <>
              <Link href={dashboardHref} aria-current={pathname.startsWith(dashboardHref) ? "page" : undefined} className={linkClass(pathname.startsWith(dashboardHref))}>
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={LayoutDashboard} size="xs" />
                  Dashboard
                </span>
              </Link>
              <Link href={profileHref} aria-current={pathname.startsWith(profileHref) ? "page" : undefined} className={linkClass(pathname.startsWith(profileHref))}>
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={User} size="xs" />
                  Profile
                </span>
              </Link>
            </>
          ) : (
            <>
              {HOMEPAGE_SECTION_LINKS.map((link) => (
                <Link
                  key={link.hash}
                  href={homepageSectionHref(link.hash, false)}
                  className={linkClass(false)}
                >
                  {link.label}
                </Link>
              ))}
              {HOMEPAGE_AUTH_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(pathname === link.href || pathname.startsWith(link.href))}
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loggedIn && role && !isHome ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-raised)] lg:inline-flex lg:items-center lg:gap-1.5"
            >
              <AppIcon icon={LogOut} size="xs" />
              Logout
            </button>
          ) : loggedIn && role && isHome ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-raised)] lg:inline-flex lg:items-center lg:gap-1.5"
            >
              <AppIcon icon={LogOut} size="xs" />
              Logout
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1 text-[var(--ds-muted)] transition hover:bg-[var(--ds-surface-raised)] md:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="navbar-mobile-menu"
          >
            <AppIcon icon={Menu} size="md" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div id="navbar-mobile-menu" className="border-t border-[var(--ds-border)] bg-[var(--ds-navbar)] px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {isHome ? (
              <>
                {HOMEPAGE_SECTION_LINKS.map((link) => (
                  <li key={link.hash}>
                    <Link
                      href={homepageSectionHref(link.hash, true)}
                      onClick={(event) => handleHomepageSectionClick(event, link.hash)}
                      className={mobileLinkClass(isSectionActive(link.hash))}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {HOMEPAGE_AUTH_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={mobileLinkClass(pathname.startsWith(link.href))}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {loggedIn && role ? (
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cn(mobileLinkClass(false), "w-full text-left")}
                    >
                      Logout
                    </button>
                  </li>
                ) : null}
              </>
            ) : loggedIn && role ? (
              <>
                <li>
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(pathname.startsWith(dashboardHref))}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href={profileHref}
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(pathname.startsWith(profileHref))}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={handleLogout} className={cn(mobileLinkClass(false), "w-full text-left")}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                {HOMEPAGE_SECTION_LINKS.map((link) => (
                  <li key={link.hash}>
                    <Link
                      href={homepageSectionHref(link.hash, false)}
                      onClick={() => setMobileOpen(false)}
                      className={mobileLinkClass(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {HOMEPAGE_AUTH_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={mobileLinkClass(pathname.startsWith(link.href))}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}

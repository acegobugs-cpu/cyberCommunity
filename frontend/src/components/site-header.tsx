"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { NavItem } from "@/components/nav-item";

export function SiteHeader({
  subdomain,
  nav,
  portalBase,
}: {
  subdomain: string | null;
  nav: NavItem[];
  /** Absolute origin of the portal host (no trailing slash); auth/dashboard links live there. */
  portalBase: string;
}) {
  const pathname = usePathname();
  const { user, isAdmin, signout, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const isPortal = !subdomain || subdomain === "portal" || subdomain === "www";
  // On the portal host use relative paths (client-side navigation); on an area
  // host these pages live on a different origin, so use absolute URLs.
  const p = (path: string) => (isPortal ? path : `${portalBase}${path}`);
  const portalNav = [
    { key: "home", label: "Home", href: "/" },
    { key: "members", label: "Members", href: "/members" },
    { key: "announcements", label: "News", href: "/announcements" },
    { key: "events", label: "Events", href: "/events" },
    { key: "settings", label: "Settings", href: "/settings", admin: true },
  ];
  const visibleNav = portalNav.filter((i) => !i.admin || (!loading && isAdmin));

  return (
    <header className="sticky top-0 z-50 border-b border-htb-border bg-htb-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href={p("/")} className="flex items-center gap-2.5 group">
          <LogoMark className="h-7 w-7 text-htb-green transition-transform group-hover:scale-110" />
          <div className="flex flex-col leading-none">
            <span className="htb-heading text-sm tracking-wider text-htb-text">
              CYBER<span className="text-htb-green">_</span>CLUB
            </span>
            <span className="htb-mono text-[0.625rem] text-htb-text-dim tracking-widest">
              PORTAL v1.0
            </span>
          </div>
        </Link>

        {isPortal && (
          <nav className="hidden md:flex items-center gap-1">
            {visibleNav
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`htb-mono text-xs uppercase tracking-wider px-3 py-2 rounded transition-colors ${
                      active
                        ? "text-htb-green bg-htb-green/10"
                        : "text-htb-text-muted hover:text-htb-text hover:bg-htb-bg-hover"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        )}

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1 text-xs htb-mono uppercase tracking-wider text-htb-text-dim">
          <span className="text-htb-text-dim">{"//"}</span>
          {nav.map((n, idx) => (
            <span key={n.key} className="flex items-center gap-1">
              {idx > 0 && <span className="text-htb-text-dim">/</span>}
              <a
                href={n.href}
                className={`px-2 py-1 rounded transition-colors ${
                  n.key === subdomain
                    ? "text-htb-green"
                    : "text-htb-text-muted hover:text-htb-text"
                }`}
              >
                {n.label.toLowerCase()}
              </a>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={p("/dashboard")}
                className="htb-button htb-button-ghost hidden sm:inline-flex"
              >
                {user.username}
                <span className="htb-mono text-[0.6rem] text-htb-text-dim normal-case tracking-normal">
                  ▸
                </span>
              </Link>
              <button
                onClick={() => void signout("here")}
                className="htb-button htb-button-ghost"
                title="leave this app; the account stays signed in elsewhere"
              >
                Sign out
              </button>
              <button
                onClick={() => void signout("all")}
                className="htb-button htb-button-ghost hidden sm:inline-flex text-htb-text-dim"
                title="remove this account from every app"
              >
                everywhere
              </button>
            </>
          ) : (
            <>
              <Link
                href={p("/signin")}
                className="htb-button htb-button-ghost hidden sm:inline-flex"
              >
                Sign in
              </Link>
              <Link href={p("/signup")} className="htb-button htb-button-primary">
                Join
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden htb-button htb-button-ghost px-2.5"
          aria-label="menu"
        >
          <span className="htb-mono">≡</span>
        </button>
      </div>

      {open && isPortal && (
        <div className="md:hidden border-t border-htb-border bg-htb-bg-elevated">
          <nav className="flex flex-col p-2">
            {visibleNav
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="htb-mono text-xs uppercase tracking-wider px-3 py-2.5 rounded text-htb-text-muted hover:text-htb-green hover:bg-htb-bg-hover"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M4 8h6l2 4h-4l-2 4h10l-2 4h-6l-2 4h6l-2 4H4" />
      <path d="M18 4h4l-2 4h4l-2 4h-4l2 4h4l-2 4h-4l-2 4h-2" opacity="0.5" />
      <circle cx="26" cy="6" r="2" fill="currentColor" />
    </svg>
  );
}

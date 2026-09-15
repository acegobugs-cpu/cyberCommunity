"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import type { SiteArea } from "@/lib/subdomains";
import Link from "next/link";

/**
 * Shown on an area host when no account is active here but other accounts are
 * signed in on this browser. "Continue as X" joins the service with that
 * account (idempotent) and makes it active for this host.
 */
export function AccountSwitcher({ service }: { service: SiteArea }) {
  const router = useRouter();
  const { user, accounts, switchAccount } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const others = accounts.filter((a) => a.id !== user?.id);
  if (user || others.length === 0) return null;

  async function pick(id: string) {
    setBusy(id);
    setError(null);
    try {
      await switchAccount(id, service);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "could not switch account");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    <div className="htb-card border-htb-amber/40 p-4 mb-6 htb-mono text-xs flex flex-col items-center gap-3">
      <span className="text-htb-amber">continue in {service} as</span>
      {others.map((a) => (
        <button
          key={a.id}
          disabled={busy !== null}
          onClick={() => pick(a.id)}
          className="htb-button htb-button-secondary !py-1 disabled:opacity-50"
        >
          {busy === a.id ? "…" : a.username}
          <span className="text-htb-text-dim ml-1">{a.email}</span>
        </button>
      ))}
      {error && <span className="text-htb-red w-full">! {error}</span>}
    </div>
    <div className="flex flex-col items-center gap-3">
        <Link
          href={`/signin`}
          className="htb-button htb-button-secondary !py-1"
        >
          Sign in with another account
        </Link>
        <Link
          href={`/signup`}
          className=""
        >
          Sign up for a new account
        </Link>
    </div>
    </> 
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function SigninPage() {
  const router = useRouter();
  const { signin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signin(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim mb-2">
          &gt; auth --signin
        </div>
        <h1 className="htb-heading text-3xl text-htb-text">
          Welcome back<span className="text-htb-green">_</span>
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Sign in to access your dashboard, courses, and CTF scores.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="htb-label" htmlFor="email">
              email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="htb-input"
              placeholder="operator@cyberclubportal.com"
            />
          </div>

          <div>
            <label className="htb-label" htmlFor="password">
              password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="htb-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="htb-card border-htb-red/40 bg-htb-red/5 p-3">
              <div className="htb-mono text-xs text-htb-red">
                ! error: {error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="htb-button htb-button-primary w-full disabled:opacity-50"
          >
            {loading ? "authenticating..." : "Sign in"}
            <span className="htb-mono">→</span>
          </button>
        </form>

        <div className="mt-6 htb-divider" />

        <div className="mt-6 htb-card p-4">
          <div className="htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim mb-2">
            {"// demo accounts"}
          </div>
          <div className="space-y-1 htb-mono text-xs text-htb-text-muted">
            <div>
              <span className="text-htb-green">root@cyberclubportal.com</span>{" "}
              / root1234
            </div>
            <div>
              <span className="text-htb-green">neuromancer@cyberclubportal.com</span>{" "}
              / pass1234
            </div>
          </div>
        </div>

        <div className="mt-6 text-center htb-mono text-xs text-htb-text-muted">
          new here?{" "}
          <Link href="/signup" className="text-htb-green hover:underline">
            create an account →
          </Link>
        </div>
      </div>
    </main>
  );
}

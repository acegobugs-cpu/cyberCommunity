"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(username, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim mb-2">
          &gt; auth --register
        </div>
        <h1 className="htb-heading text-3xl text-htb-text">
          New operator<span className="text-htb-green">_</span>
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Create your account. We require a valid{" "}
          <span className="text-htb-green">.edu</span> email for verification.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="htb-label" htmlFor="username">
              username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="htb-input"
              placeholder="operator_42"
            />
          </div>

          <div>
            <label className="htb-label" htmlFor="email">
              university email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="htb-input"
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label className="htb-label" htmlFor="password">
              password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="htb-input"
              placeholder="at least 8 characters"
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
            {loading ? "creating account..." : "Create account"}
            <span className="htb-mono">→</span>
          </button>
        </form>

        <div className="mt-6 text-center htb-mono text-xs text-htb-text-muted">
          already have an account?{" "}
          <Link href="/signin" className="text-htb-green hover:underline">
            sign in →
          </Link>
        </div>
      </div>
    </main>
  );
}

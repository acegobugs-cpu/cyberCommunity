"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccess(false);

    if (username.trim().length < 3) {
      setError("username must be at least 3 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signup(username.trim(), email.trim(), password);
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("signup failed");
      }
    } finally {
      setLoading(false);
    }
  }, [username, email, password, signup, router]);

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
          Create your account to start tracking points, joining CTFs, and
          climbing the leaderboard.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="htb-label" htmlFor="username">
              username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="htb-input"
              placeholder="operator_42"
            />
            <div className="htb-mono text-[0.65rem] text-htb-text-dim mt-1">
              3+ characters
            </div>
          </div>

          <div>
            <label className="htb-label" htmlFor="email">
              email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="htb-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="htb-label" htmlFor="password">
              password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="htb-input"
              placeholder="at least 8 characters"
            />
            <div className="htb-mono text-[0.65rem] text-htb-text-dim mt-1">
              8+ characters
            </div>
          </div>

          {error && (
            <div className="htb-card border-htb-red/40 bg-htb-red/5 p-3">
              <div className="htb-mono text-xs text-htb-red">
                ! error: {error}
              </div>
            </div>
          )}

          {success && (
            <div className="htb-card border-htb-green/40 bg-htb-green/5 p-3">
              <div className="htb-mono text-xs text-htb-green">
                ✓ account created — redirecting to dashboard...
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || success}
            className="htb-button htb-button-primary w-full disabled:opacity-50"
          >
            {loading
              ? "creating account..."
              : success
                ? "success"
                : "Create account"}
            <span className="htb-mono">→</span>
          </button>
        </div>

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

function formatApiError(err: ApiError): string {
  const body = err.body as
    | { error?: string; message?: string; timestamp?: string }
    | string
    | null;

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    if (body.error && body.message) {
      return `${body.error}: ${body.message}`;
    }
    if (body.error) return body.error;
    if (body.message) return body.message;
  }

  if (err.status === 0) return "network error — is the gateway reachable?";
  if (err.status === 409) return "email or username already in use";
  if (err.status === 502) return "gateway unreachable — is docker-compose up?";
  if (err.status >= 500) return `server error (${err.status})`;
  return `request failed (${err.status})`;
}

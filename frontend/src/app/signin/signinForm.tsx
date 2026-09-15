// app/(portal)/signin/SigninForm.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAfterAuth } from "@/lib/use-after-auth";
import { ApiError } from "@/lib/api";

interface SigninFormProps {
  currentSubdomain: string;
}

export function SigninForm({ currentSubdomain }: SigninFormProps) {
  const afterAuth = useAfterAuth();
  const { signin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("please enter your email");
      return;
    }
    if (!password) {
      setError("please enter your password");
      return;
    }

    setLoading(true);
    try {
      await signin(email, password);
      setSuccess(true);
      afterAuth();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("sign in failed");
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, signin, afterAuth]);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim mb-2">
          &gt; auth --signin [{currentSubdomain}]
        </div>
        <h1 className="htb-heading text-3xl text-htb-text">
          Welcome back<span className="text-htb-green">_</span>
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Sign in to access your {currentSubdomain} dashboard, courses, and CTF scores.
        </p>

        <div className="mt-8 space-y-5">
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
              placeholder="operator@cyberclubportal.com"
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
              autoComplete="current-password"
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

          {success && (
            <div className="htb-card border-htb-green/40 bg-htb-green/5 p-3">
              <div className="htb-mono text-xs text-htb-green">
                ✓ authenticated — redirecting...
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
              ? "authenticating..."
              : success
                ? "success"
                : "Sign in"}
            <span className="htb-mono">→</span>
          </button>
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

function formatApiError(err: ApiError): string {
  const body = err.body as
    | { error?: string; message?: string }
    | string
    | null;

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    if (body.error && body.message) return `${body.error}: ${body.message}`;
    if (body.error) return body.error;
    if (body.message) return body.message;
  }

  if (err.status === 0) return "network error — is the gateway reachable?";
  if (err.status === 401) return "invalid email or password";
  if (err.status === 404) return "no account exists with this email";
  if (err.status === 502) return "gateway unreachable — is docker-compose up?";
  if (err.status >= 500) return `server error (${err.status})`;
  return `request failed (${err.status})`;
}
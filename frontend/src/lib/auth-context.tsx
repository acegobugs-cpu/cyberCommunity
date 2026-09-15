"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, SessionResponse, AccountSummary } from "@/lib/types";
import { api, configureApi } from "@/lib/api";

/**
 * Client-side view of the session. JWTs never reach the browser; the BFF keeps
 * every signed-in account in a shared httpOnly cookie and a host-only cookie
 * saying which one THIS app uses. `/api/session` hydrates both.
 */
interface AuthState {
  /** Account active on this host, null when none is selected here. */
  user: User | null;
  /** Role in the portal service (`USER` / `ADMIN`), null when unknown or signed out. */
  portalRole: string | null;
  /** Every account signed in on this browser (shared across apps). */
  accounts: AccountSummary[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  /** `service` = the app the user signs up from; they become a member of it. */
  signin: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, service: string) => Promise<void>;
  /** Use an already signed-in account on this host, joining `service` if needed. */
  switchAccount: (accountId: string, service: string) => Promise<void>;
  /** `"here"` leaves this app only; `"all"` removes the account from every app. */
  signout: (scope?: "here" | "all") => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { user: null, portalRole: null, accounts: [], loading: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, loading: true });

  const applySession = useCallback((s: SessionResponse | null, accounts: AccountSummary[] = []) => {
    if (!s) {
      setState({ ...SIGNED_OUT, accounts });
      return;
    }
    setState({ user: s.user, portalRole: s.portalRole ?? null, accounts: s.accounts ?? [], loading: false });
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await api.get<SessionResponse>("/api/session"));
    } catch (e) {
      // 401 still carries the account list so the UI can offer "Continue as …".
      const body = (e as { body?: { accounts?: AccountSummary[] } }).body;
      applySession(null, body?.accounts ?? []);
    }
  }, [applySession]);

  // Hydrate from the cookies on first render.
  useEffect(() => {
    let active = true;
    api
      .get<SessionResponse>("/api/session")
      .then((s) => active && applySession(s))
      .catch((e) => {
        if (!active) return;
        const body = (e as { body?: { accounts?: AccountSummary[] } }).body;
        applySession(null, body?.accounts ?? []);
      });
    return () => {
      active = false;
    };
  }, [applySession]);

  // Any 401 from the BFF (expired cookie) deselects the account on this host.
  useEffect(() => {
    configureApi({ onUnauthorized: () => setState((s) => ({ ...s, user: null, portalRole: null, loading: false })) });
  }, []);

  const signin = useCallback(
    async (email: string, password: string) => {
      await api.post<SessionResponse>("/api/auth/signin", { email, password });
      await refresh();
    },
    [refresh],
  );

  const signup = useCallback(
    async (username: string, email: string, password: string, service: string) => {
      await api.post<SessionResponse>(`/api/auth/signup?service=${encodeURIComponent(service)}`, {
        username,
        email,
        password,
      });
      await refresh();
    },
    [refresh],
  );

  const switchAccount = useCallback(
    async (accountId: string, service: string) => {
      await api.post<SessionResponse>(`/api/membership/${encodeURIComponent(service)}`, { accountId });
      await refresh();
    },
    [refresh],
  );

  const signout = useCallback(
    async (scope: "here" | "all" = "here") => {
      try {
        await api.post(`/api/auth/signout${scope === "all" ? "?scope=all" : ""}`);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAdmin: state.portalRole === "ADMIN",
      signin,
      signup,
      switchAccount,
      signout,
      refresh,
    }),
    [state, signin, signup, switchAccount, signout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

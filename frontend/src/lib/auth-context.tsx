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
import type { User, SessionResponse } from "@/lib/types";
import { api, configureApi } from "@/lib/api";

/**
 * Client-side view of the session. The JWT itself is NEVER available here: it
 * lives in an httpOnly cookie managed by the BFF. On mount we ask
 * `/api/session` whether a valid session exists and who the user is.
 */
interface AuthState {
  user: User | null;
  /** Role in the portal service (`USER` / `ADMIN`), null when unknown or signed out. */
  portalRole: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { user: null, portalRole: null, loading: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    portalRole: null,
    loading: true,
  });

  const applySession = useCallback((s: SessionResponse | null) => {
    if (!s) {
      setState(SIGNED_OUT);
      return;
    }
    setState({ user: s.user, portalRole: s.portalRole ?? null, loading: false });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<SessionResponse>("/api/session");
      applySession(s);
    } catch {
      applySession(null);
    }
  }, [applySession]);

  // Hydrate from the cookie on first render.
  useEffect(() => {
    let active = true;
    api
      .get<SessionResponse>("/api/session")
      .then((s) => {
        if (active) applySession(s);
      })
      .catch(() => {
        if (active) applySession(null);
      });
    return () => {
      active = false;
    };
  }, [applySession]);

  // Any 401 from the BFF (expired cookie, revoked session) signs the client out.
  useEffect(() => {
    configureApi({ onUnauthorized: () => setState(SIGNED_OUT) });
  }, []);

  const signin = useCallback(
    async (email: string, password: string) => {
      await api.post<SessionResponse>("/api/signin", { email, password });
      await refresh();
    },
    [refresh],
  );

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      await api.post<SessionResponse>("/api/signup", {
        username,
        email,
        password,
      });
      await refresh();
    },
    [refresh],
  );

  const signout = useCallback(async () => {
    try {
      await api.post("/api/signout");
    } finally {
      setState(SIGNED_OUT);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAdmin: state.portalRole === "ADMIN",
      signin,
      signup,
      signout,
      refresh,
    }),
    [state, signin, signup, signout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

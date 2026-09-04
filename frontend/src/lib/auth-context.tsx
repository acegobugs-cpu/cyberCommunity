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
import type { User, AuthResponse } from "@/lib/types";
import { api, configureApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signin: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  signout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "ccp.auth";

interface StoredAuth {
  user: User;
  token: string;
}

function readInitialState(): AuthState {
  if (typeof window === "undefined") {
    return { user: null, token: null, loading: true };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, loading: false };
    const parsed = JSON.parse(raw) as { user: User; token: string };
    return {
      user: parsed.user,
      token: parsed.token,
      loading: false,
    };
  } catch {
    return { user: null, token: null, loading: false };
  }
}

function decodeJwtSubject(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState);

  useEffect(() => {
    configureApi({
      getToken: () => state.token,
    });
  }, [state.token]);

  const setAuth = useCallback((stored: StoredAuth | null) => {
    if (stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setState({ user: stored.user, token: stored.token, loading: false });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  const signin = useCallback(
    async (email: string, password: string) => {
      const res: AuthResponse = await api.post("/api/signin", {
        email,
        password,
      });
      if (!res?.accessToken) {
        throw new Error("signin response missing accessToken");
      }
      const id = decodeJwtSubject(res.accessToken) ?? "";
      const user: User = {
        id,
        username: email.split("@")[0],
        email,
      };
      setAuth({ user, token: res.accessToken });
    },
    [setAuth],
  );

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      const res: AuthResponse = await api.post("/api/signup", {
        username,
        email,
        password,
      });
      if (!res?.accessToken) {
        throw new Error("signup response missing accessToken");
      }
      const id = decodeJwtSubject(res.accessToken) ?? "";
      const user: User = {
        id,
        username,
        email,
      };
      setAuth({ user, token: res.accessToken });
    },
    [setAuth],
  );

  const signout = useCallback(() => {
    setAuth(null);
  }, [setAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signin, signup, signout }),
    [state, signin, signup, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

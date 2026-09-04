"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, AuthResponse } from "@/lib/types";
import { api } from "@/lib/api";

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

function readStoredState(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw) as { user: User | null; token: string | null };
    return { user: parsed.user, token: parsed.token };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [stored, setStored] = useState<{
    user: User | null;
    token: string | null;
  }>({ user: null, token: null });

  if (!hydrated && typeof window !== "undefined") {
    const next = readStoredState();
    if (next.user !== stored.user || next.token !== stored.token) {
      setStored(next);
    }
    setHydrated(true);
  }

  const setAuth = useCallback(
    (next: { user: User | null; token: string | null }) => {
      setStored(next);
      if (next.user && next.token) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [],
  );

  const signin = useCallback(
    async (email: string, password: string) => {
      const res: AuthResponse = await api.post("/api/signin", {
        email,
        password,
      });
      const user: User = {
        id: res.accessToken.split(".")[0] || "",
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
      const user: User = {
        id: res.accessToken.split(".")[0] || "",
        username,
        email,
      };
      setAuth({ user, token: res.accessToken });
    },
    [setAuth],
  );

  const signout = useCallback(() => {
    setAuth({ user: null, token: null });
  }, [setAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: stored.user,
      token: stored.token,
      loading: !hydrated,
      signin,
      signup,
      signout,
    }),
    [stored, hydrated, signin, signup, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

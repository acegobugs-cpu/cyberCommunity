import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@/lib/types";

/**
 * Server-only module (imports next/headers). Do not import from client components.
 *
 * Session storage: the JWT issued by the identity service lives ONLY in an
 * httpOnly cookie. The browser never sees it; BFF route handlers read it and
 * forward it to the gateway as `Authorization: Bearer …`.
 */
export const SESSION_COOKIE = "ccp_session";

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decodes the payload of a JWT WITHOUT verifying the signature. This is safe
 * here because the token is only used for display (user id / email) and for
 * an expiry pre-check; the gateway performs the real verification on every
 * forwarded request.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload, skewSeconds = 5): boolean {
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function userFromToken(token: string, username?: string): User | null {
  const payload = decodeJwt(token);
  if (!payload?.sub || isExpired(payload)) return null;
  const email = payload.email ?? "";
  return {
    id: payload.sub,
    email,
    username: username ?? email.split("@")[0] ?? payload.sub,
  };
}

/** Reads the raw session token from the request cookies (server components / route handlers). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload || isExpired(payload)) return null;
  return token;
}

export function setSessionCookie(
  res: NextResponse,
  token: string,
  expiresInSeconds: number,
): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, Math.floor(expiresInSeconds)),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

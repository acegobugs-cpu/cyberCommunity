import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@/lib/types";

/**
 * Server-only module (imports next/headers) — never import from client code.
 *
 * Multi-account session store, two cookies:
 *
 *   ccp_accounts  Domain=<SESSION_COOKIE_DOMAIN>  httpOnly   every signed-in account (JWT + identity)
 *                 shared by all apps (portal, learn, …)
 *   ccp_active    host-only                       httpOnly   which account THIS app uses
 *
 * So ace@uni can be active on the portal host while ctf-alias@mail is active
 * on the challenge host, and each app offers "Continue as …" for the others.
 * JWTs never reach the browser; the BFF forwards the active one as Authorization.
 */
const ACCOUNTS_COOKIE = "ccp_accounts";
const ACTIVE_COOKIE = "ccp_active";
const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
/** Keeps the cookie well under the 4 KB limit (~350 B per JWT). */
const MAX_ACCOUNTS = 5;
const CLOCK_SKEW_S = 5;

interface JwtPayload {
  sub?: string;
  email?: string;
  username?: string;
  exp?: number;
}

export interface Account {
  id: string;
  email: string;
  username: string;
  token: string;
  /** epoch seconds */
  exp: number;
}

/** Non-sensitive view returned to the browser. */
export type AccountSummary = Omit<Account, "token">;

export interface Session {
  user: User;
  token: string;
}

// ---------------------------------------------------------------- jwt

/** Payload only — signature is verified by the gateway, not here. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
  } catch {
    return null;
  }
}

function nowS() {
  return Math.floor(Date.now() / 1000);
}

function isLive(a: Account) {
  return a.exp > nowS() + CLOCK_SKEW_S;
}

function cookieOptions(maxAge: number, domain?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain,
    maxAge: Math.max(0, Math.floor(maxAge)),
  };
}

// ---------------------------------------------------------------- read

/** All live accounts in the shared cookie (expired ones are dropped). */
export async function listAccounts(): Promise<Account[]> {
  const raw = (await cookies()).get(ACCOUNTS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Account[];
    return Array.isArray(parsed) ? parsed.filter(isLive) : [];
  } catch {
    return [];
  }
}

export function summarize(a: Account): AccountSummary {
  return { id: a.id, email: a.email, username: a.username, exp: a.exp };
}

/**
 * The session for this host: the account selected by `ccp_active` (or an
 * explicit id). Null when nothing is selected or the selection has expired.
 */
export async function getSession(accountId?: string): Promise<Session | null> {
  const id = accountId ?? (await cookies()).get(ACTIVE_COOKIE)?.value;
  if (!id) return null;
  const account = (await listAccounts()).find((a) => a.id === id);
  if (!account) return null;
  return { token: account.token, user: toUser(account) };
}

/** Convenience for server components that only need the bearer token. */
export async function getSessionToken(): Promise<string | null> {
  return (await getSession())?.token ?? null;
}

// ---------------------------------------------------------------- write

function writeAccounts(res: NextResponse, accounts: Account[]) {
  const maxExp = accounts.reduce((m, a) => Math.max(m, a.exp), 0);
  res.cookies.set({
    name: ACCOUNTS_COOKIE,
    value: Buffer.from(JSON.stringify(accounts)).toString("base64url"),
    ...cookieOptions(maxExp - nowS(), COOKIE_DOMAIN),
  });
}

function writeActive(res: NextResponse, account: Account | null) {
  res.cookies.set({
    name: ACTIVE_COOKIE,
    value: account?.id ?? "",
    ...cookieOptions(account ? account.exp - nowS() : 0),
  });
}

/** Builds an Account from a token issued by identity; null if unusable/expired. */
export function accountFromToken(token: string, usernameHint?: string): Account | null {
  const p = decodeJwt(token);
  if (!p?.sub || !p.exp || p.exp <= nowS() + CLOCK_SKEW_S) return null;
  const email = p.email ?? "";
  return {
    id: p.sub,
    email,
    username: p.username ?? usernameHint ?? email.split("@")[0] ?? p.sub,
    token,
    exp: p.exp,
  };
}

export function toUser(a: Account): User {
  return { id: a.id, email: a.email, username: a.username };
}

/**
 * Stores an account in the shared list (replacing any older entry for the same
 * user, evicting the soonest-expiring beyond the cap) and makes it active for
 * this host. Returns the resulting account list.
 */
export async function storeAccount(res: NextResponse, account: Account): Promise<Account[]> {
  const others = (await listAccounts()).filter((a) => a.id !== account.id);
  const kept = [...others].sort((a, b) => b.exp - a.exp).slice(0, MAX_ACCOUNTS - 1);
  const all = [...kept, account];
  writeAccounts(res, all);
  writeActive(res, account);
  return all;
}

/** Selects an already-stored account for this host. Null if unknown/expired. */
export async function activateAccount(res: NextResponse, accountId: string): Promise<Account | null> {
  const account = (await listAccounts()).find((a) => a.id === accountId);
  if (!account) return null;
  writeActive(res, account);
  return account;
}

/** Sign out of THIS app only; the account stays available to other apps. */
export function clearActive(res: NextResponse) {
  writeActive(res, null);
}

/** Remove the account everywhere (and deselect it here if it was active). */
export async function removeAccount(res: NextResponse, accountId: string) {
  const remaining = (await listAccounts()).filter((a) => a.id !== accountId);
  writeAccounts(res, remaining);
  const active = (await cookies()).get(ACTIVE_COOKIE)?.value;
  if (active === accountId) writeActive(res, null);
}

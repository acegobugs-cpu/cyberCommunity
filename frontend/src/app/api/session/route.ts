import { NextResponse } from "next/server";
import { getSession, listAccounts, summarize } from "@/lib/server/session";
import { getPortalInfo } from "@/lib/data/portal";
import type { SessionResponse } from "@/lib/types";

/**
 * Hydrates the client auth context. Always lists the accounts available on
 * this browser; 401 only when no account is active for THIS host (the client
 * then shows "Continue as …" if `accounts` is non-empty).
 */
export async function GET(): Promise<NextResponse> {
  const [session, accounts] = await Promise.all([getSession(), listAccounts()]);
  const summaries = accounts.map(summarize);

  if (!session) {
    return NextResponse.json({ error: "no active session", accounts: summaries }, { status: 401 });
  }

  const info = await getPortalInfo(session.token);
  const body: SessionResponse = {
    user: session.user,
    expiresIn: 0,
    portalRole: info?.role ?? null,
    accounts: summaries,
  };
  return NextResponse.json(body);
}

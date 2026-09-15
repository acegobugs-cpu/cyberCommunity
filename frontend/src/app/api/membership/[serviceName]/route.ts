import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exchangeForSession } from "@/lib/server/auth-handler";
import { getSession } from "@/lib/server/session";
import { isValidSubdomain } from "@/lib/subdomains";

/**
 * POST /api/membership/{service}  body: { accountId? }
 *
 * Joins `service` with one of the browser's signed-in accounts (default: the
 * account active on this host). Identity re-issues a token, which becomes the
 * active session here — so "Continue as X in Learn" and "Join Learn" are the
 * same call.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ serviceName: string }> }) {
  const { serviceName } = await ctx.params;
  if (!isValidSubdomain(serviceName) || serviceName === "www") {
    return NextResponse.json({ error: "unknown service" }, { status: 404 });
  }

  let accountId: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { accountId?: unknown };
    if (typeof body.accountId === "string") accountId = body.accountId;
  } catch {
    /* empty body is fine */
  }

  const session = await getSession(accountId);
  if (!session) {
    return NextResponse.json({ error: "sign in first" }, { status: 401 });
  }

  return exchangeForSession(`/api/memberships/${encodeURIComponent(serviceName)}`, {
    token: session.token,
    usernameHint: session.user.username,
  });
}

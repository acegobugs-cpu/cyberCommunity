import { NextResponse } from "next/server";
import { getSessionToken, userFromToken } from "@/lib/server/session";
import { getPortalInfo } from "@/lib/data/portal";
import type { SessionResponse } from "@/lib/types";

/**
 * Hydrates the client-side auth context from the httpOnly session cookie.
 * Returns 401 when there is no (valid, unexpired) session.
 */
export async function GET(): Promise<NextResponse> {
  const token = await getSessionToken();
  const user = token ? userFromToken(token) : null;
  if (!token || !user) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  const info = await getPortalInfo(token);
  const body: SessionResponse = {
    user,
    expiresIn: 0,
    portalRole: info?.role ?? null,
  };
  return NextResponse.json(body);
}

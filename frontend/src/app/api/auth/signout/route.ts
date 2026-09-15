import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearActive, getSession, removeAccount } from "@/lib/server/session";

/**
 * POST /api/auth/signout            → sign out of this app only (account stays available elsewhere)
 * POST /api/auth/signout?scope=all  → remove the active account from every app
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  if (req.nextUrl.searchParams.get("scope") === "all") {
    const session = await getSession();
    if (session) await removeAccount(res, session.user.id);
    else clearActive(res);
  } else {
    clearActive(res);
  }
  return res;
}

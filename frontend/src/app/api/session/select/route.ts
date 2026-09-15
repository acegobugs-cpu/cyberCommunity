import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { activateAccount, toUser } from "@/lib/server/session";

/** POST { accountId } — make one of the stored accounts active for this host. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let accountId: unknown;
  try {
    ({ accountId } = (await req.json()) as { accountId?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof accountId !== "string" || !accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const account = await activateAccount(res, accountId);
  if (!account) {
    return NextResponse.json({ error: "account not signed in or expired" }, { status: 404 });
  }
  const out = NextResponse.json({ user: toUser(account) });
  for (const c of res.cookies.getAll()) out.cookies.set(c);
  return out;
}

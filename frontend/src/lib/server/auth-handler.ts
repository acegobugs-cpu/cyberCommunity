import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { gatewayFetch } from "@/lib/gateway";
import { accountFromToken, storeAccount, summarize, toUser } from "@/lib/server/session";
import type { AuthResponse, SessionResponse } from "@/lib/types";

/**
 * Shared tail of signin / signup / join: call identity, store the issued JWT
 * in the account cookies (and make it active for this host), return only the
 * non-sensitive session view to the browser.
 */
export async function exchangeForSession(
  identityPath: string,
  options: { body?: string; token?: string | null; created?: boolean; usernameHint?: string } = {},
): Promise<NextResponse> {
  let upstream: Response;
  try {
    upstream = await gatewayFetch(identityPath, {
      service: "identity",
      method: "POST",
      body: options.body ?? null,
      token: options.token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "gateway unreachable", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  }

  let auth: AuthResponse | null = null;
  try {
    auth = JSON.parse(text) as AuthResponse;
  } catch {
    /* handled below */
  }
  const account = auth?.accessToken ? accountFromToken(auth.accessToken, options.usernameHint) : null;
  if (!auth || !account) {
    return NextResponse.json({ error: "invalid response from identity" }, { status: 502 });
  }

  // Body first (needs the final account list), then cookies on the same response.
  const res = NextResponse.json({} as SessionResponse, { status: options.created ? 201 : 200 });
  const all = await storeAccount(res, account);
  const body: SessionResponse = { user: toUser(account), expiresIn: auth.expiresIn, accounts: all.map(summarize) };
  const out = NextResponse.json(body, { status: res.status });
  for (const c of res.cookies.getAll()) out.cookies.set(c);
  return out;
}

/** Signin/signup: JSON credentials in, session out. `service` = the app the user signed in from. */
export async function completeAuth(
  req: NextRequest,
  identityPath: "/api/auth/signin" | "/api/auth/signup",
): Promise<NextResponse> {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const service = req.nextUrl.searchParams.get("service");
  const isSignup = identityPath.endsWith("/signup");
  const path = isSignup && service ? `${identityPath}?service=${encodeURIComponent(service)}` : identityPath;

  return exchangeForSession(path, {
    body: JSON.stringify(payload),
    created: isSignup,
    usernameHint: typeof payload.username === "string" ? payload.username : undefined,
  });
}

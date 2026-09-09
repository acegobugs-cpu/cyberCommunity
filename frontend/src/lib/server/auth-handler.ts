import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { gatewayFetch } from "@/lib/gateway";
import { setSessionCookie, userFromToken } from "@/lib/server/session";
import type { AuthResponse, SessionResponse } from "@/lib/types";

/**
 * Exchanges credentials for a JWT via identity, stores the JWT in an httpOnly
 * cookie and returns only the (non-sensitive) user profile to the browser.
 */
export async function completeAuth(
  req: NextRequest,
  backendPath: "/signin" | "/signup",
): Promise<NextResponse> {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const username =
    typeof payload.username === "string" ? payload.username : undefined;

  let upstream: Response;
  try {
    upstream = await gatewayFetch(backendPath, {
      service: "identity",
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "gateway unreachable",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();

  if (!upstream.ok) {
    // Pass identity's error body/status straight through.
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  let auth: AuthResponse;
  try {
    auth = JSON.parse(text) as AuthResponse;
  } catch {
    return NextResponse.json(
      { error: "invalid response from identity" },
      { status: 502 },
    );
  }
  if (!auth?.accessToken) {
    return NextResponse.json(
      { error: "identity response missing accessToken" },
      { status: 502 },
    );
  }

  const user = userFromToken(auth.accessToken, username);
  if (!user) {
    return NextResponse.json(
      { error: "identity returned an invalid or expired token" },
      { status: 502 },
    );
  }

  const body: SessionResponse = { user, expiresIn: auth.expiresIn };
  const res = NextResponse.json(body, {
    status: backendPath === "/signup" ? 201 : 200,
  });
  setSessionCookie(res, auth.accessToken, auth.expiresIn);
  return res;
}

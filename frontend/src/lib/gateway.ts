import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionToken } from "@/lib/server/session";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080";

export type GatewayService = "identity" | "portal" | "learn" | "community" | "challenge";

/** Headers that must never be forwarded to (or returned from) the gateway. */
export const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "accept-encoding",
  "cookie", // session cookie is for this origin only; token is sent as Authorization instead
  "x-internal-auth",
  "x-user-id",
]);
export const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
]);

/**
 * Low-level call to the gateway from server code (route handlers, server
 * components). Adds `X-Service-Name` and, when a token is given, `Authorization`.
 */
export async function gatewayFetch(
  path: string,
  options: {
    service: GatewayService;
    token?: string | null;
    method?: string;
    body?: BodyInit | null;
    headers?: HeadersInit;
  },
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  headers.set("X-Service-Name", options.service);
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${GATEWAY_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? undefined,
    cache: "no-store",
  });
}

/**
 * Transparent proxy used by BFF route handlers. The session token is read from
 * the httpOnly cookie and forwarded as `Authorization`; the cookie itself is
 * never sent upstream.
 */
export async function forwardToGateway(
  req: NextRequest,
  options: {
    service: GatewayService;
    backendPath: string;
  },
): Promise<NextResponse> {
  const { service, backendPath } = options;
  const search = req.nextUrl.search;
  const url = `${GATEWAY_URL}${backendPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  headers.set("X-Service-Name", service);

  if (!headers.has("Authorization")) {
    const token = await getSessionToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let upstream: Response;

  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "gateway unreachable",
        gateway: GATEWAY_URL,
        service,
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) return;
    responseHeaders.set(key, value);
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080";

export async function forwardToGateway(
  req: NextRequest,
  options: {
    service: string;
    backendPath: string;
  },
): Promise<NextResponse> {
  const { service, backendPath } = options;
  const search = req.nextUrl.search;
  const url = `${GATEWAY_URL}${backendPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "content-length" ||
      lower === "connection" ||
      lower === "accept-encoding"
    ) {
      return;
    }
    headers.set(key, value);
  });
  headers.set("X-Service-Name", service);

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

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
    const lower = key.toLowerCase();
    if (
      lower === "content-encoding" ||
      lower === "transfer-encoding" ||
      lower === "connection" ||
      lower === "keep-alive"
    ) {
      return;
    }
    responseHeaders.set(key, value);
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

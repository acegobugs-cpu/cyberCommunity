import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractSubdomain } from "@/lib/subdomains";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const url = request.nextUrl;
  const pathname = url.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return NextResponse.next();
  }

  const headerResponse = NextResponse.next();
  headerResponse.headers.set("x-subdomain", subdomain);
  return headerResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

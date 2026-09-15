import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITES_PREFIX,
  extractSubdomain,
  isSiteArea,
  areaUrl,
} from "@/lib/subdomains";

/**
 * Host-based routing (Next.js 16 middleware, file name `proxy.ts`).
 *
 *   learn.<root>/courses/x   → rewrite → /sites/learn/courses/x
 *   community.<root>/        → rewrite → /sites/community
 *   <root>/dashboard         → portal pages, untouched
 *   <root>/learn             → redirect → learn.<root>/   (areas are NOT reachable by path on the portal host)
 *   any-host/sites/learn/x   → redirect → learn.<root>/x  (internal prefix must not leak)
 *
 * `/api/*`, `/_next/*` and static files are host-agnostic and pass through.
 */
const PORTAL_ONLY_PATHS = new Set([
  "home",
  "settings",
  "members",
  "announcements",
  "events",
]);

const AUTH_PATHS = new Set(["signin", "signup"]);
/**
 * Cross-host redirect. Next relativises a Location whose origin equals the
 * server's own origin (`http://localhost:<port>` under `next start`), which is
 * why `areaUrl()` never targets bare `localhost` from an area host.
 */
function redirectTo(absoluteUrl: string, status: 307 | 308 = 308) {
  return NextResponse.redirect(absoluteUrl, status);
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;
  const host = request.headers.get("host");

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(host);

  // Never serve the internal prefix directly; send the user to the real host.
  if (pathname === SITES_PREFIX || pathname.startsWith(`${SITES_PREFIX}/`)) {
    const [, , area, ...rest] = pathname.split("/");
    if (isSiteArea(area)) {
      return redirectTo(areaUrl(area, host, `/${rest.join("/")}`));
    }
    return NextResponse.rewrite(new URL("/404", url));
  }

  if (isSiteArea(subdomain)) {
    const first = pathname.split("/")[1];

    // Portal-only pages (dashboard, members, …) live on the portal host.
    if (PORTAL_ONLY_PATHS.has(first)) {
      return redirectTo(areaUrl("portal", host, pathname));
    }

    // /signin and /signup are shared by every app: serve them as-is on this host.
    if (AUTH_PATHS.has(first)) {
      const res = NextResponse.next();
      res.headers.set("x-subdomain", subdomain);
      return res;
    }

    // Area host: everything else is served from /sites/<area>/**
    const rewritten = url.clone();
    rewritten.pathname = `${SITES_PREFIX}/${subdomain}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.rewrite(rewritten);
    res.headers.set("x-subdomain", subdomain);
    return res;
  }

  // Portal host (root, www, portal, plain localhost/IP, or unknown subdomain):
  // block path-style access to areas (/learn, /community/x, …)
  const first = pathname.split("/")[1];
  if (isSiteArea(first)) {
    return redirectTo(areaUrl(first, host, pathname.slice(first.length + 1) || "/"));
  }
  const res = NextResponse.next();
  res.headers.set("x-subdomain", subdomain ?? "portal");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

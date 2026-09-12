/**
 * Subdomain routing for the single Next.js app.
 *
 * Each area is served ONLY on its own host:
 *   portal:      <root>, www.<root>, portal.<root>   (pages under src/app/(portal) + src/app/page.tsx)
 *   community:   community.<root>                    (pages under src/app/sites/community)
 *   learn:       learn.<root>                        (pages under src/app/sites/learn)
 *   challenges:  challenges.<root>                   (pages under src/app/sites/challenges)
 *
 * `proxy.ts` rewrites `learn.<root>/x` → `/sites/learn/x` internally and blocks
 * direct requests to `/sites/*`, so the internal path never leaks.
 * Locally the hosts are `localhost:3000`, `learn.localhost:3000`, … (browsers
 * resolve *.localhost to 127.0.0.1 without any hosts-file entry).
 */
export const SUBDOMAINS = {
  PORTAL: "portal",
  COMMUNITY: "community",
  LEARN: "learn",
  CHALLENGES: "challenges",
  WWW: "www",
} as const;

export type Subdomain = (typeof SUBDOMAINS)[keyof typeof SUBDOMAINS];

/** Areas that have their own page tree under src/app/sites/<area>. */
export type SiteArea = typeof SUBDOMAINS.COMMUNITY | typeof SUBDOMAINS.LEARN | typeof SUBDOMAINS.CHALLENGES;

export const SITE_AREAS: readonly SiteArea[] = [
  SUBDOMAINS.COMMUNITY,
  SUBDOMAINS.LEARN,
  SUBDOMAINS.CHALLENGES,
];

/** Internal (rewritten-to) path prefix; never visible to users. */
export const SITES_PREFIX = "/sites";

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cyberclubportal.com").toLowerCase();

export function isPortalSubdomain(sub: Subdomain | null): boolean {
  return sub === null || sub === SUBDOMAINS.PORTAL || sub === SUBDOMAINS.WWW;
}

export function isSiteArea(value: string | null | undefined): value is SiteArea {
  return !!value && (SITE_AREAS as readonly string[]).includes(value);
}

export function extractSubdomain(host: string | null): Subdomain | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  const root = ROOT_DOMAIN;

  if (hostname === root || hostname === `www.${root}`) {
    return SUBDOMAINS.WWW;
  }

  if (hostname.endsWith(`.${root}`)) {
    const candidate = hostname.slice(0, -`.${root}`.length);
    const sub = candidate.split(".").pop();
    if (sub && (Object.values(SUBDOMAINS) as string[]).includes(sub)) {
      return sub as Subdomain;
    }
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") return SUBDOMAINS.WWW;
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.split(".")[0];
    if ((Object.values(SUBDOMAINS) as string[]).includes(sub)) {
      return sub as Subdomain;
    }
  }

  return null;
}

export function isValidSubdomain(value: string): value is Subdomain {
  return (Object.values(SUBDOMAINS) as string[]).includes(value);
}

/**
 * Absolute URL of an area, derived from the CURRENT host so it works on
 * localhost:3000, *.localhost:3000 and production alike.
 *   areaUrl("learn", "localhost:3000")               → http://learn.localhost:3000/
 *   areaUrl("portal", "learn.cyberclubportal.com")   → https://cyberclubportal.com/
 *   areaUrl("challenges", "cyberclubportal.com", "/x") → https://challenges.cyberclubportal.com/x
 */
export function areaUrl(area: Subdomain, currentHost: string | null, path = "/"): string {
  const host = (currentHost ?? "localhost:3000").toLowerCase();
  const [hostname, port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1";
  // An explicit non-443 port means plain http (dev / hosts-file domains); otherwise https.
  const proto = isLocalhost || (port && port !== "443") ? "http" : "https";
  const base = isLocalhost ? "localhost" : ROOT_DOMAIN;

  let target: string;
  if (area === SUBDOMAINS.PORTAL || area === SUBDOMAINS.WWW) {
    // On *.localhost hosts, link the portal as `portal.localhost` rather than
    // bare `localhost`: Next relativises redirects that target the server's own
    // origin (localhost:<port>), which would loop back to the area host.
    target = isLocalhost && hostname.endsWith(".localhost") ? `portal.${base}` : base;
  } else {
    target = `${area}.${base}`;
  }
  return `${proto}://${target}${portSuffix}${path.startsWith("/") ? path : `/${path}`}`;
}

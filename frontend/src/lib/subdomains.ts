export const SUBDOMAINS = {
  PORTAL: "portal",
  COMMUNITY: "community",
  LEARN: "learn",
  CHALLENGES: "challenges",
  WWW: "www",
} as const;

export type Subdomain = (typeof SUBDOMAINS)[keyof typeof SUBDOMAINS];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cyberclubportal.com";

export const SUBDOMAIN_PATHS: Record<Subdomain, string> = {
  [SUBDOMAINS.PORTAL]: "",
  [SUBDOMAINS.COMMUNITY]: "/community",
  [SUBDOMAINS.LEARN]: "/learn",
  [SUBDOMAINS.CHALLENGES]: "/challenges",
  [SUBDOMAINS.WWW]: "",
};

export function extractSubdomain(host: string | null): Subdomain | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  const root = ROOT_DOMAIN.toLowerCase();

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

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    if (parts.length === 1) return SUBDOMAINS.WWW;
    const sub = parts[0];
    if ((Object.values(SUBDOMAINS) as string[]).includes(sub)) {
      return sub as Subdomain;
    }
  }

  return null;
}

export function isValidSubdomain(value: string): value is Subdomain {
  return (Object.values(SUBDOMAINS) as string[]).includes(value);
}

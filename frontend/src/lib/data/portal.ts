import { gatewayFetch } from "@/lib/gateway";
import type { PortalInfo } from "@/lib/types";

/**
 * `GET /portal/info` on the portal service. Requires an authenticated session;
 * returns null when there is no token or the call fails.
 */
export async function getPortalInfo(
  token: string | null,
): Promise<PortalInfo | null> {
  if (!token) return null;
  try {
    const res = await gatewayFetch("/portal/info", {
      service: "portal",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as PortalInfo;
  } catch {
    return null;
  }
}

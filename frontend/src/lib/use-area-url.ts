"use client";

import { useSyncExternalStore } from "react";
import { areaUrl, type Subdomain } from "@/lib/subdomains";

const subscribe = () => () => {};
const getHost = () => window.location.host;
const getServerHost = () => null;

/**
 * Client-side counterpart of `areaUrl()` for components that cannot read
 * request headers. Uses the browser's current host so links resolve to
 * `learn.localhost:3000` in dev and `learn.<root>` in production.
 */
export function useAreaUrl() {
  const host = useSyncExternalStore(subscribe, getHost, getServerHost);
  return (area: Subdomain, path = "/") => areaUrl(area, host, path);
}

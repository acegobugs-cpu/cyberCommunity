"use client";

import { useSearchParams } from "next/navigation";

/**
 * Where to go after signin/signup: the `next` query param if it is a same-site
 * relative path, otherwise the app root. Never a full URL (open-redirect guard).
 */
export function useAfterAuth(): () => void {
  const params = useSearchParams();
  return () => {
    const next = params.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    window.location.assign(target);
  };
}

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/session";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

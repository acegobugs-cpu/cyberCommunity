import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/server/session";
import { getEnrichedMembers } from "@/lib/data/members";

export async function GET(): Promise<NextResponse> {
  const token = await getSessionToken();
  const { members, source } = await getEnrichedMembers(token);
  return NextResponse.json(members, { headers: { "X-Data-Source": source } });
}

import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-data";
import type { Setting } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Setting>;
  Object.assign(mockDb.settings, body, { tenantId: "cyberclub" });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(mockDb.settings);
}

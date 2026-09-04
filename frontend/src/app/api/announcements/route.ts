import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(mockDb.announcements);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = `a${Date.now()}`;
  const newAnn = {
    id,
    tenantId: "portal",
    title: body.title ?? "Untitled",
    body: body.body ?? "",
    authorId: body.authorId ?? "u1",
    pinned: !!body.pinned,
    createdAt: new Date().toISOString(),
    type: body.type ?? "info",
  };
  mockDb.announcements.unshift(newAnn);
  return NextResponse.json(newAnn, { status: 201 });
}

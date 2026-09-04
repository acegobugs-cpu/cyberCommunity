import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(mockDb.tenants);
}

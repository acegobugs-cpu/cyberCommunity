import { NextResponse } from "next/server";
import { findTenant } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    service: "portal",
    version: "1.0.0",
    description:
      "Cyber Club Portal — administrative and public-facing backbone for the platform.",
    tenant: findTenant("cyberclub"),
  });
}

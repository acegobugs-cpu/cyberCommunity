import { forwardToGateway } from "@/lib/gateway";
import type { NextRequest } from "next/server";

/** The single door into the Learn service (Plan 01 §7). */
export async function POST(req: NextRequest) {
  return forwardToGateway(req, { service: "learn", backendPath: "/graphql" });
}

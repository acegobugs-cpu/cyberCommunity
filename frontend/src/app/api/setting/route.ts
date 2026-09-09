import { forwardToGateway } from "@/lib/gateway";
import type { NextRequest } from "next/server";

// Portal only exposes POST /setting today; there is no GET to read settings back.
export async function POST(req: NextRequest) {
  return forwardToGateway(req, {
    service: "portal",
    backendPath: "/setting",
  });
}

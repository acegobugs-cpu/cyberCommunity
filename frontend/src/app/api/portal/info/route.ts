import { forwardToGateway } from "@/lib/gateway";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return forwardToGateway(req, {
    service: "portal",
    backendPath: "/portal/info",
  });
}

import { forwardToGateway } from "@/lib/gateway";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return forwardToGateway(req, {
    service: "identity",
    backendPath: "/signin",
  });
}

import { forwardToGateway } from "@/lib/gateway";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return forwardToGateway(req, { service: "learn", backendPath: "/graphql" });
}
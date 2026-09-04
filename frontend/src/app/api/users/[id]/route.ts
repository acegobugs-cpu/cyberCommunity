import { forwardToGateway } from "@/lib/gateway";
import type { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardToGateway(req, {
    service: "portal",
    backendPath: `/users/${id}`,
  });
}

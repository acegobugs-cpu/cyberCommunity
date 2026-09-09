import { completeAuth } from "@/lib/server/auth-handler";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return completeAuth(req, "/signup");
}

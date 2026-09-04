import { NextResponse } from "next/server";
import { mockDb, findUserByEmail } from "@/lib/mock-data";
import type { AuthResponse, SigninRequest } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as SigninRequest;

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const user = findUserByEmail(body.email);
  if (!user || user.password !== body.password) {
    return NextResponse.json(
      { error: "invalid credentials" },
      { status: 401 },
    );
  }

  mockDb.currentUserId = user.id;

  const token = `mock.${user.id}.${Date.now()}`;
  const res: AuthResponse = {
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 86400,
  };
  return NextResponse.json(res);
}

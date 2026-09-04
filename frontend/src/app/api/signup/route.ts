import { NextResponse } from "next/server";
import { mockDb, findUserByEmail, findUserByUsername } from "@/lib/mock-data";
import type { AuthResponse, SignupRequest } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as SignupRequest;

  if (!body.username || !body.email || !body.password) {
    return NextResponse.json(
      { error: "username, email and password are required" },
      { status: 400 },
    );
  }

  if (findUserByEmail(body.email)) {
    return NextResponse.json(
      { error: "email already registered" },
      { status: 409 },
    );
  }

  if (findUserByUsername(body.username)) {
    return NextResponse.json(
      { error: "username already taken" },
      { status: 409 },
    );
  }

  const id = crypto.randomUUID();
  const colors = ["#9fef00", "#00d4ff", "#a855f7", "#ff2e63", "#ffaa00"];
  const newUser = {
    id,
    username: body.username,
    email: body.email,
    password: body.password,
    bio: "",
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    rank: mockDb.users.length + 1,
    points: 0,
    createdAt: new Date().toISOString(),
    globalRoles: ["USER" as const],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "MEMBER" as const },
    ],
    skills: [],
    status: "online" as const,
    country: "?",
    joinedAt: new Date().toISOString(),
  };
  mockDb.users.push(newUser);
  mockDb.currentUserId = id;

  const token = `mock.${id}.${Date.now()}`;
  const res: AuthResponse = {
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 86400,
  };
  return NextResponse.json(res, { status: 201 });
}

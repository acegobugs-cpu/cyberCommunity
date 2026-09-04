import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-data";

export async function GET() {
  const tenantId = "cyberclub";
  const members = mockDb.users
    .filter((u) => u.memberships.some((m) => m.tenantId === tenantId))
    .map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      rank: u.rank,
      points: u.points,
      role: u.memberships.find((m) => m.tenantId === tenantId)?.tenantRole,
      avatarColor: u.avatarColor,
      status: u.status,
      country: u.country,
      skills: u.skills,
    }));
  return NextResponse.json(members);
}

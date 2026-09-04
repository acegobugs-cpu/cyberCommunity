import { mockDb, findMemberByEmail, findMemberByUsername } from "@/lib/mock-data";
import { NextResponse } from "next/server";
import type { Member } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  const upstream = await fetch(
    `${process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080"}/users`,
    {
      headers: { "X-Service-Name": "portal" },
      cache: "no-store",
    },
  ).catch(() => null);

  let realMembers: Member[] = [];
  if (upstream && upstream.ok) {
    try {
      realMembers = (await upstream.json()) as Member[];
    } catch {
      realMembers = [];
    }
  }

  if (realMembers.length === 0) {
    realMembers = mockDb.memberProfiles.map((p) => ({
      service_name: "portal",
      username: p.username,
      email: p.email,
      role:
        p.serviceRoles.find((r) => r.service_name === "portal")?.role ??
        "MEMBER",
      created_at: p.joinedAt,
    }));
  }

  const enriched = realMembers.map((m) => {
    const profile =
      findMemberByEmail(m.email) ?? findMemberByUsername(m.username);
    if (!profile) {
      return {
        ...m,
        bio: null,
        rank: 999,
        points: 0,
        skills: [],
        status: "offline" as const,
        country: "?",
        joined_at: m.created_at,
        avatarColor: null,
      };
    }
    return {
      ...m,
      id: profile.id,
      bio: profile.bio,
      rank: profile.rank,
      points: profile.points,
      skills: profile.skills,
      status: profile.status,
      country: profile.country,
      joined_at: profile.joinedAt,
      avatarColor: profile.avatarColor,
    };
  });

  return NextResponse.json(enriched);
}

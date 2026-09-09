import { gatewayFetch } from "@/lib/gateway";
import { mockDb, findMemberByEmail, findMemberByUsername } from "@/lib/mock-data";
import type { Member } from "@/lib/types";
import type { EnrichedMember } from "@/lib/enriched-types";

/**
 * Member directory. With a session token the real list is read from the portal
 * service (`GET /users`); without one, or if the gateway is unreachable, the
 * mock profiles are used. Either way the result is enriched with the
 * presentation-only profile data (rank, points, skills…) that the backend does
 * not store yet.
 */
export async function getEnrichedMembers(
  token: string | null,
): Promise<{ members: EnrichedMember[]; source: "gateway" | "mock" }> {
  let realMembers: Member[] = [];
  let source: "gateway" | "mock" = "mock";

  if (token) {
    try {
      const res = await gatewayFetch("/users", { service: "portal", token });
      if (res.ok) {
        realMembers = (await res.json()) as Member[];
        source = "gateway";
      }
    } catch {
      realMembers = [];
    }
  }

  if (realMembers.length === 0) {
    source = "mock";
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

  const members: EnrichedMember[] = realMembers.map((m) => {
    const profile =
      findMemberByEmail(m.email) ?? findMemberByUsername(m.username);
    if (!profile) {
      return {
        ...m,
        id: m.email,
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

  return { members, source };
}

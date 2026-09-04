import type { Member } from "@/lib/types";

export interface EnrichedMember extends Member {
  id: string;
  bio: string | null;
  rank: number;
  points: number;
  skills: string[];
  status: "online" | "offline" | "away";
  country: string;
  joined_at: string;
  avatarColor: string | null;
}

import Link from "next/link";
import { api } from "@/lib/api";
import { MemberAvatar } from "@/components/member-avatar";

type Member = {
  id: string;
  username: string;
  email: string;
  rank: number;
  points: number;
  avatarColor: string;
  status: "online" | "offline" | "away";
  country: string;
  skills: string[];
  role?: string;
};

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  let members: Member[] = [];
  try {
    members = await api.get<Member[]>("/api/users");
  } catch {
    members = [];
  }

  const sorted = [...members].sort((a, b) => a.rank - b.rank);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 w-full">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
            &gt; ./members --list
          </div>
          <h1 className="htb-heading text-3xl text-htb-text mt-1">
            Operators
            <span className="text-htb-green htb-mono"> [{members.length}]</span>
          </h1>
          <p className="htb-mono text-sm text-htb-text-muted mt-2">
            Members of the Cyber Club tenant, ranked by points this season.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="htb-badge htb-badge-green">
            <span className="h-1.5 w-1.5 rounded-full bg-htb-green animate-htb-pulse" />
            {members.filter((m) => m.status === "online").length} online
          </span>
        </div>
      </div>

      <div className="htb-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-htb-border bg-htb-bg-elevated htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
          <div className="col-span-1">#</div>
          <div className="col-span-4">operator</div>
          <div className="col-span-2">role</div>
          <div className="col-span-2">country</div>
          <div className="col-span-2 text-right">points</div>
          <div className="col-span-1 text-right">status</div>
        </div>

        {sorted.map((m, i) => (
          <Link
            key={m.id}
            href="#"
            className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b border-htb-border last:border-b-0 hover:bg-htb-bg-hover transition-colors"
          >
            <div className="col-span-1 htb-mono text-sm text-htb-text-dim">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <MemberAvatar
                name={m.username}
                color={m.avatarColor}
                size="md"
              />
              <div className="min-w-0">
                <div className="htb-mono text-sm text-htb-text truncate">
                  {m.username}
                </div>
                <div className="htb-mono text-[0.65rem] text-htb-text-dim truncate">
                  {m.email}
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <span className="htb-badge htb-badge-cyan">
                {m.role ?? "MEMBER"}
              </span>
            </div>
            <div className="col-span-2 htb-mono text-xs text-htb-text-muted">
              {m.country}
            </div>
            <div className="col-span-2 htb-mono text-sm text-htb-green text-right">
              {m.points.toLocaleString()}
            </div>
            <div className="col-span-1 text-right">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  m.status === "online"
                    ? "bg-htb-green"
                    : m.status === "away"
                      ? "bg-htb-amber"
                      : "bg-htb-text-dim"
                }`}
              />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

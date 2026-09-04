"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { api } from "@/lib/api";
import { MemberAvatar } from "@/components/member-avatar";
import { ActivityFeed } from "@/components/activity-feed";
import { useRouter } from "next/navigation";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/signin");
      return;
    }

    let active = true;
    (async () => {
      try {
        const users = await api.get<Member[]>("/api/users");
        const me = users.find((u) => u.email === user.email) ?? null;
        if (active) setMember(me);
      } catch {
        if (active) setMember(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="htb-mono text-htb-text-dim animate-htb-pulse">
          loading session...
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
            &gt; session --active
          </div>
          <h1 className="htb-heading text-3xl text-htb-text mt-1">
            Welcome back,{" "}
            <span className="text-htb-green htb-glow">{user.username}</span>
            <span className="text-htb-green">_</span>
          </h1>
        </div>
        {member && (
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={member.username}
              color={member.avatarColor}
              status={member.status}
              size="lg"
            />
            <div>
              <div className="htb-mono text-sm text-htb-text">
                {member.username}
              </div>
              <div className="htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-widest">
                {member.role ?? "MEMBER"} · {member.country}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <StatCard
          label="rank"
          value={member ? `#${member.rank}` : "—"}
          sub="global position"
          tone="green"
        />
        <StatCard
          label="points"
          value={member ? member.points.toLocaleString() : "0"}
          sub="earned this season"
          tone="cyan"
        />
        <StatCard
          label="badges"
          value="12"
          sub="3 unlocked this month"
          tone="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="htb-heading text-xl text-htb-text mb-3">
              <span className="text-htb-green htb-mono">##</span> Quick actions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionCard
                href="/learn"
                title="Continue learning"
                desc="Resume 'Practical Binary Exploitation' · module 4 of 12"
                tag="learn"
              />
              <ActionCard
                href="/challenges"
                title="Next CTF"
                desc="Web Exploitation Sprint starts in 3h 24m"
                tag="ctf"
              />
              <ActionCard
                href="/announcements"
                title="News"
                desc="3 new announcements · 1 pinned"
                tag="info"
              />
              <ActionCard
                href="/members"
                title="Community"
                desc="Browse 1,248 operators across 3 tenants"
                tag="social"
              />
            </div>
          </div>

          <div>
            <h2 className="htb-heading text-xl text-htb-text mb-3">
              <span className="text-htb-green htb-mono">##</span> Your skills
            </h2>
            <div className="htb-card p-5">
              <div className="flex flex-wrap gap-2">
                {(member?.skills ?? []).map((s) => (
                  <span key={s} className="htb-badge htb-badge-cyan">
                    {s}
                  </span>
                ))}
                <Link
                  href="/settings"
                  className="htb-badge htb-badge-purple"
                >
                  + add
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="htb-heading text-xl text-htb-text mb-3">
            <span className="text-htb-green htb-mono">##</span> Activity
          </h2>
          <ActivityFeed members={member ? [member] : []} />
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "cyan" | "purple";
}) {
  const TONE = {
    green: "text-htb-green htb-glow-sm",
    cyan: "text-htb-cyan",
    purple: "text-htb-purple",
  };
  return (
    <div className="htb-card p-5">
      <div className="htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
        &gt; {label}
      </div>
      <div className={`htb-heading mt-2 text-3xl ${TONE[tone]}`}>{value}</div>
      <div className="htb-mono text-xs text-htb-text-dim mt-1">{sub}</div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  desc,
  tag,
}: {
  href: string;
  title: string;
  desc: string;
  tag: string;
}) {
  const TAG: Record<string, string> = {
    learn: "htb-badge htb-badge-cyan",
    ctf: "htb-badge htb-badge-green",
    info: "htb-badge htb-badge-amber",
    social: "htb-badge htb-badge-purple",
  };
  return (
    <Link
      href={href}
      className="htb-card htb-card-interactive p-4 block group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={TAG[tag]}>{tag}</span>
      </div>
      <div className="htb-mono text-sm text-htb-text group-hover:text-htb-green transition-colors">
        {title}
      </div>
      <div className="htb-mono text-xs text-htb-text-muted mt-1">{desc}</div>
    </Link>
  );
}

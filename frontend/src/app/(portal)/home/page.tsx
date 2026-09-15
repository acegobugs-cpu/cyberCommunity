"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { api } from "@/lib/api";
import { MemberAvatar } from "@/components/member-avatar";
import { ActivityFeed } from "@/components/activity-feed";
import { useRouter } from "next/navigation";
import type { EnrichedMember } from "@/lib/enriched-types";
import { useAreaUrl } from "@/lib/use-area-url";

export default function DashboardPage() {
  const router = useRouter();
  const areaHref = useAreaUrl();
  const { user, portalRole, loading: authLoading } = useAuth();
  const [member, setMember] = useState<EnrichedMember | null>(null);
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
        const members = await api.get<EnrichedMember[]>("/api/members");
        if (!active) return;
        const me = members.find((m) => m.email === user.email) ?? null;
        setMember(me);
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
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
            &gt; session --active
          </div>
          <h1 className="htb-heading text-3xl text-htb-text mt-1">
            Welcome back,{" "}
            <span className="text-htb-green htb-glow">{user.username}</span>
            <span className="text-htb-green">_</span>
          </h1>
          {portalRole && (
            <div className="htb-mono text-[0.65rem] text-htb-text-dim mt-1">
              portal role:{" "}
              <span className="text-htb-green">{portalRole}</span>
            </div>
          )}
        </div>
        {member && (
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={member.username}
              color={member.avatarColor ?? undefined}
              status={member.status}
              size="lg"
            />
            <div>
              <div className="htb-mono text-sm text-htb-text">
                {member.username}
              </div>
              <div className="htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-widest">
                {member.role} · {member.country}
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
          value={String(member?.skills.length ?? 0)}
          sub="skills tracked"
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
                href={areaHref("learn")}
                title="Continue learning"
                desc="Resume 'Practical Binary Exploitation' · module 4 of 12"
                tag="learn"
              />
              <ActionCard
                href={areaHref("challenges")}
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
                desc="Browse operators across the platform"
                tag="social"
              />
            </div>
          </div>

          {member && member.skills.length > 0 && (
            <div>
              <h2 className="htb-heading text-xl text-htb-text mb-3">
                <span className="text-htb-green htb-mono">##</span> Your skills
              </h2>
              <div className="htb-card p-5">
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((s) => (
                    <span key={s} className="htb-badge htb-badge-cyan">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
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

import Link from "next/link";
import { api } from "@/lib/api";
import { TerminalBlock } from "@/components/terminal-block";
import { ActivityFeed } from "@/components/activity-feed";
import { MemberAvatar } from "@/components/member-avatar";
import { AnnouncementCard } from "@/components/announcement-card";
import { EventCard } from "@/components/event-card";
import { StatsBar } from "@/components/stats-bar";
import type { PortalInfo } from "@/lib/types";
import type { EnrichedMember } from "@/lib/enriched-types";
import type { MockAnnouncement, MockEvent } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function fetchData() {
  const [members, announcements, events, portalInfo] = await Promise.allSettled([
    api.get<EnrichedMember[]>("/api/members"),
    api.get<MockAnnouncement[]>("/api/announcements"),
    api.get<MockEvent[]>("/api/events"),
    api.get<PortalInfo>("/api/portal/info"),
  ]);
  return {
    members: members.status === "fulfilled" ? members.value : [],
    announcements:
      announcements.status === "fulfilled" ? announcements.value : [],
    events: events.status === "fulfilled" ? events.value : [],
    portalInfo: portalInfo.status === "fulfilled" ? portalInfo.value : null,
  };
}

export default async function HomePage() {
  const { members, announcements, events, portalInfo } = await fetchData();

  const sortedMembers = [...members].sort((a, b) => a.rank - b.rank);
  const topMembers = sortedMembers.slice(0, 5);
  const onlineCount = members.filter((m) => m.status === "online").length;
  const pinned = announcements.find((a) => a.pinned);
  const recent = announcements.filter((a) => !a.pinned).slice(0, 3);
  const upcomingEvents = [...events]
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 3);

  return (
    <main>
      <HeroSection
        memberCount={members.length}
        portalInfo={portalInfo}
      />
      <StatsBar
        memberCount={members.length}
        onlineCount={onlineCount}
        eventCount={upcomingEvents.length}
        announcementCount={announcements.length}
      />

      <section className="border-t border-htb-border">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="htb-heading text-2xl text-htb-text">
                  <span className="text-htb-green htb-mono">##</span>{" "}
                  Pinned & Recent
                </h2>
                <Link
                  href="/announcements"
                  className="htb-mono text-xs uppercase tracking-wider text-htb-text-muted hover:text-htb-green"
                >
                  view all →
                </Link>
              </div>

              {pinned ? (
                <AnnouncementCard announcement={pinned} expanded />
              ) : (
                <div className="htb-card p-6 text-center htb-mono text-xs text-htb-text-dim">
                  no announcements yet
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                {recent.map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} />
                ))}
                {recent.length === 0 && (
                  <div className="htb-card p-6 text-center htb-mono text-xs text-htb-text-dim md:col-span-3">
                    no recent announcements
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="htb-heading text-2xl text-htb-text">
                <span className="text-htb-green htb-mono">##</span> Live Feed
              </h2>
              <ActivityFeed members={topMembers} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-htb-border bg-htb-bg-elevated htb-grid-bg">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="htb-heading text-2xl text-htb-text">
              <span className="text-htb-green htb-mono">##</span> Upcoming
              Events
            </h2>
            <Link
              href="/events"
              className="htb-mono text-xs uppercase tracking-wider text-htb-text-muted hover:text-htb-green"
            >
              full calendar →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {upcomingEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
            {upcomingEvents.length === 0 && (
              <div className="htb-card p-6 text-center htb-mono text-xs text-htb-text-dim lg:col-span-3">
                no upcoming events
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-htb-border">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="htb-heading text-2xl text-htb-text">
                <span className="text-htb-green htb-mono">##</span> Top
                Operators
              </h2>
              <p className="htb-mono text-xs uppercase tracking-wider text-htb-text-dim mt-2">
                ranked by points earned this season
              </p>

              <div className="mt-6 space-y-2">
                {topMembers.map((m, i) => (
                  <Link
                    key={m.email}
                    href="/members"
                    className="htb-card htb-card-interactive flex items-center gap-4 p-4"
                  >
                    <div className="htb-mono text-htb-text-dim w-6 text-right text-sm">
                      #{i + 1}
                    </div>
                    <MemberAvatar
                      name={m.username}
                      color={m.avatarColor ?? undefined}
                      status={m.status}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="htb-mono text-sm text-htb-text truncate">
                        {m.username}
                      </div>
                      <div className="htb-mono text-xs text-htb-text-dim">
                        {m.country} ·{" "}
                        {m.skills.slice(0, 2).join(" · ") ||
                          m.role.toLowerCase()}
                      </div>
                    </div>
                    <div className="htb-mono text-right">
                      <div className="text-htb-green text-sm">
                        {m.points.toLocaleString()}
                      </div>
                      <div className="text-[0.625rem] text-htb-text-dim uppercase tracking-wider">
                        points
                      </div>
                    </div>
                  </Link>
                ))}
                {topMembers.length === 0 && (
                  <div className="htb-card p-6 text-center htb-mono text-xs text-htb-text-dim">
                    no members yet — be the first
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="htb-heading text-2xl text-htb-text">
                <span className="text-htb-green htb-mono">##</span>{" "}
                Capabilities
              </h2>
              <p className="htb-mono text-xs uppercase tracking-wider text-htb-text-dim mt-2">
                four services, one platform
              </p>

              <div className="mt-6 space-y-3">
                <CapabilityRow
                  label="Portal"
                  desc="administration, news, events, settings"
                  tag="core"
                />
                <CapabilityRow
                  label="Community"
                  desc="forums, groups, direct messaging"
                  tag="social"
                />
                <CapabilityRow
                  label="Learn"
                  desc="courses, modules, progress tracking"
                  tag="education"
                />
                <CapabilityRow
                  label="Challenges"
                  desc="contests, CTFs, leaderboards, judge system"
                  tag="competitive"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroSection({
  memberCount,
  portalInfo,
}: {
  memberCount: number;
  portalInfo: PortalInfo | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-htb-border htb-grid-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-htb-bg/60 to-htb-bg" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 htb-badge htb-badge-green">
              <span className="h-1.5 w-1.5 rounded-full bg-htb-green animate-htb-pulse" />
              <span>now in open beta</span>
            </div>

            <h1 className="htb-heading text-balance text-5xl lg:text-6xl text-htb-text leading-[0.95]">
              Train. Compete.{" "}
              <span className="text-htb-green htb-glow">Hack the planet</span>
              <span className="text-htb-green">_</span>
            </h1>

            <p className="text-balance text-lg text-htb-text-muted max-w-xl">
              A modular platform for cybersecurity clubs, universities, and
              operators. Courses, contests, and a community of{" "}
              <span className="htb-mono text-htb-green">
                {memberCount || "—"}
              </span>{" "}
              verified operators.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className="htb-button htb-button-primary">
                Create account
                <span className="htb-mono text-base">→</span>
              </Link>
              <Link href="/signin" className="htb-button htb-button-secondary">
                Sign in
              </Link>
              <a
                href="https://learn.cyberclubportal.com"
                className="htb-button htb-button-ghost"
              >
                Explore platform
              </a>
            </div>

            <div className="flex items-center gap-6 pt-4 htb-mono text-xs text-htb-text-dim">
              <span>{"// no credit card"}</span>
              <span>{"// university SSO"}</span>
              <span>{"// open source"}</span>
            </div>
          </div>

          <div className="relative">
            <TerminalBlock
              lines={[
                { prompt: true, text: "curl -X POST /api/signup" },
                {
                  muted: true,
                  text: '{"username":"operator_42","email":"...","password":"..."}',
                },
                {
                  success: true,
                  text: '{"accessToken":"eyJhbGc...","tokenType":"Bearer","expiresIn":86400}',
                },
                { prompt: true, text: "curl -X POST /api/signin" },
                {
                  success: true,
                  text: '{"accessToken":"eyJhbGc...","tokenType":"Bearer","expiresIn":86400}',
                },
                { prompt: true, text: "curl /api/portal/info" },
                portalInfo
                  ? { success: true, text: JSON.stringify(portalInfo) }
                  : { muted: true, text: '{"error":"401 unauthorized"}' },
                { prompt: true, text: "echo ready_to_hack" },
                {
                  text: "ready_to_hack",
                  className: "text-htb-green htb-glow",
                },
                { prompt: true, text: "_" },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilityRow({
  label,
  desc,
  tag,
}: {
  label: string;
  desc: string;
  tag: string;
}) {
  return (
    <div className="htb-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="htb-mono text-sm text-htb-text">{label}</div>
          <div className="htb-mono text-xs text-htb-text-dim mt-1">{desc}</div>
        </div>
        <span className="htb-badge htb-badge-cyan">{tag}</span>
      </div>
    </div>
  );
}

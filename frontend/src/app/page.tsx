import Link from "next/link";
import { api } from "@/lib/api";
import { TerminalBlock } from "@/components/terminal-block";
import { StatsBar } from "@/components/stats-bar";
import { ActivityFeed } from "@/components/activity-feed";
import { AnnouncementCard } from "@/components/announcement-card";
import { MemberAvatar } from "@/components/member-avatar";
import { EventCard } from "@/components/event-card";
import { mockDb } from "@/lib/mock-data";
import type {
  MockAnnouncement,
  MockEvent,
  MockSetting,
} from "@/lib/mock-data";

type MemberRow = {
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

async function fetchData() {
  const [info, members, announcements, events, settings, portalInfo] =
    await Promise.allSettled([
      api.get<unknown>("/api/portal/info"),
      api.get<unknown>("/api/users"),
      api.get<MockAnnouncement[]>("/api/announcements"),
      api.get<MockEvent[]>("/api/events"),
      api.get<MockSetting>("/api/setting"),
      api.get<unknown>("/api/portal/info"),
    ]);
  return {
    info: info.status === "fulfilled" ? info.value : null,
    members:
      members.status === "fulfilled"
        ? (members.value as MemberRow[])
        : (mockDb.users as MemberRow[]),
    announcements:
      announcements.status === "fulfilled"
        ? announcements.value
        : mockDb.announcements,
    events: events.status === "fulfilled" ? events.value : mockDb.events,
    settings:
      settings.status === "fulfilled" ? settings.value : mockDb.settings,
    portalInfo:
      portalInfo.status === "fulfilled" ? portalInfo.value : null,
  };
}

export default async function HomePage() {
  const data = await fetchData();
  const topMembers = [...data.members]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 5);
  const pinned = data.announcements.find((a) => a.pinned);
  const recent = data.announcements.filter((a) => !a.pinned).slice(0, 3);
  const upcomingEvents = data.events
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 3);

  return (
    <main>
      <HeroSection />
      <StatsBar
        memberCount={data.members.length}
        eventCount={data.events.length}
        announcementCount={data.announcements.length}
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

              {pinned && <AnnouncementCard announcement={pinned} expanded />}

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                {recent.map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="htb-heading text-2xl text-htb-text">
                <span className="text-htb-green htb-mono">##</span> Live Feed
              </h2>
              <ActivityFeed members={data.members} />
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
                    key={m.id}
                    href="/members"
                    className="htb-card htb-card-interactive flex items-center gap-4 p-4"
                  >
                    <div className="htb-mono text-htb-text-dim w-6 text-right text-sm">
                      #{i + 1}
                    </div>
                    <MemberAvatar
                      name={m.username}
                      color={m.avatarColor}
                      status={m.status}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="htb-mono text-sm text-htb-text truncate">
                        {m.username}
                      </div>
                      <div className="htb-mono text-xs text-htb-text-dim">
                        {m.country} · {m.skills?.slice(0, 2).join(" · ")}
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

function HeroSection() {
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
              <span className="htb-mono text-htb-green">1,200+</span>{" "}
              like-minded professionals.
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
                { muted: true, text: '{"username":"operator_42","email":"...","password":"..."}' },
                { prompt: true, text: "curl -X POST /api/signin" },
                { success: true, text: '{"accessToken":"mock.****.****","tokenType":"Bearer","expiresIn":86400}' },
                { prompt: true, text: "curl /api/portal/info" },
                { success: true, text: '{"service":"portal","version":"1.0.0"}' },
                { prompt: true, text: "echo ready_to_hack" },
                { text: "ready_to_hack", className: "text-htb-green htb-glow" },
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

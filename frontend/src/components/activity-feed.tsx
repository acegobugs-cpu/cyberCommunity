"use client";

import { useEffect, useState } from "react";
import { MemberAvatar } from "./member-avatar";
import type { EnrichedMember } from "@/lib/enriched-types";

type ActivityMember = Pick<
  EnrichedMember,
  "id" | "username" | "avatarColor" | "status" | "rank"
>;

const ACTION_TEMPLATES = [
  (m: ActivityMember) => ({
    text: `${m.username} solved a challenge`,
    color: "text-htb-green",
  }),
  (m: ActivityMember) => ({
    text: `${m.username} earned the pwn badge`,
    color: "text-htb-cyan",
  }),
  (m: ActivityMember) => ({
    text: `${m.username} joined a study group`,
    color: "text-htb-purple",
  }),
  (m: ActivityMember) => ({
    text: `${m.username} started a course on reverse engineering`,
    color: "text-htb-amber",
  }),
  (m: ActivityMember) => ({
    text: `${m.username} ranked up to #${m.rank ?? "?"}`,
    color: "text-htb-green",
  }),
  (m: ActivityMember) => ({
    text: `${m.username} submitted a writeup`,
    color: "text-htb-magenta",
  }),
];

export function ActivityFeed({ members }: { members: EnrichedMember[] }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const items = Array.from({ length: 6 }).map((_, i) => {
    const member = members[(tick + i) % Math.max(members.length, 1)];
    if (!member) {
      return {
        text: "system booted",
        color: "text-htb-text-dim",
        member: null as ActivityMember | null,
        time: "now",
      };
    }
    const tmpl = ACTION_TEMPLATES[(tick + i) % ACTION_TEMPLATES.length];
    const action = tmpl(member);
    return {
      ...action,
      member,
      time: `${(i + 1) * 2}m ago`,
    };
  });

  return (
    <div className="htb-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; tail -f activity.log
        </div>
        <span className="htb-badge htb-badge-green">
          <span className="h-1.5 w-1.5 rounded-full bg-htb-green animate-htb-pulse" />
          live
        </span>
      </div>

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            {item.member ? (
              <MemberAvatar
                name={item.member.username}
                color={item.member.avatarColor ?? undefined}
                status={item.member.status}
                size="sm"
              />
            ) : (
              <div className="h-6 w-6 rounded bg-htb-bg border border-htb-border" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`htb-mono text-xs ${item.color}`}>
                {item.text}
              </div>
            </div>
            <div className="htb-mono text-[0.65rem] text-htb-text-dim shrink-0">
              {item.time}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

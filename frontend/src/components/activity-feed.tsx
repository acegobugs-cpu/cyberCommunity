"use client";

import { useEffect, useState } from "react";
import { MemberAvatar } from "./member-avatar";

type Member = {
  id: string;
  username: string;
  avatarColor?: string;
  status?: "online" | "offline" | "away";
  rank?: number;
  points?: number;
};

const ACTION_TEMPLATES = [
  (m: Member) => ({
    text: `${m.username} solved a challenge`,
    color: "text-htb-green",
  }),
  (m: Member) => ({
    text: `${m.username} earned the pwn badge`,
    color: "text-htb-cyan",
  }),
  (m: Member) => ({
    text: `${m.username} joined a study group`,
    color: "text-htb-purple",
  }),
  (m: Member) => ({
    text: `${m.username} started a course on reverse engineering`,
    color: "text-htb-amber",
  }),
  (m: Member) => ({
    text: `${m.username} ranked up to #${m.rank ?? "?"}`,
    color: "text-htb-green",
  }),
  (m: Member) => ({
    text: `${m.username} submitted a writeup`,
    color: "text-htb-magenta",
  }),
];

export function ActivityFeed({ members }: { members: Member[] }) {
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
        member: null as Member | null,
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
                color={item.member.avatarColor}
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

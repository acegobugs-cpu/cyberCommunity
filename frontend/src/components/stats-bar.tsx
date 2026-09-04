type Stat = {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "cyan" | "purple" | "amber";
};

const TONE: Record<Stat["tone"], string> = {
  green: "text-htb-green htb-glow-sm",
  cyan: "text-htb-cyan",
  purple: "text-htb-purple",
  amber: "text-htb-amber",
};

export function StatsBar({
  memberCount,
  eventCount,
  announcementCount,
}: {
  memberCount: number;
  eventCount: number;
  announcementCount: number;
}) {
  const computed: Stat[] = [
    {
      label: "members",
      value: memberCount.toLocaleString(),
      sub: "+24 this week",
      tone: "green",
    },
    {
      label: "active events",
      value: String(eventCount),
      sub: "2 ending soon",
      tone: "cyan",
    },
    {
      label: "announcements",
      value: String(announcementCount),
      sub: "1 pinned",
      tone: "purple",
    },
    { label: "uptime", value: "99.97%", sub: "30-day rolling", tone: "amber" },
  ];

  return (
    <section className="border-b border-htb-border bg-htb-bg-elevated">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-htb-border rounded">
          {computed.map((s, i) => (
            <div
              key={s.label}
              className="bg-htb-bg-elevated px-6 py-5"
            >
              <div className="htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
                {`> ${s.label}`}
              </div>
              <div
                className={`htb-heading mt-2 text-3xl ${TONE[s.tone]} ${
                  i === 0 ? "animate-htb-flicker" : ""
                }`}
              >
                {s.value}
              </div>
              <div className="htb-mono text-[0.65rem] text-htb-text-dim mt-1">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

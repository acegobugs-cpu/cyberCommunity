type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  type: "ctf" | "workshop" | "meetup" | "hackathon";
  location: "virtual" | string;
  attendeeCount: number;
  rsvpCount: number;
};

const TYPE_META: Record<Event["type"], { label: string; class: string }> = {
  ctf: { label: "ctf", class: "htb-badge htb-badge-green" },
  workshop: { label: "workshop", class: "htb-badge htb-badge-cyan" },
  meetup: { label: "meetup", class: "htb-badge htb-badge-purple" },
  hackathon: { label: "hackathon", class: "htb-badge htb-badge-amber" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventCard({ event }: { event: Event }) {
  const meta = TYPE_META[event.type];
  const startDate = new Date(event.startsAt);
  const day = startDate.getDate();
  const month = startDate.toLocaleDateString("en-US", { month: "short" });

  return (
    <article className="htb-card htb-card-interactive overflow-hidden">
      <div className="flex">
        <div className="flex flex-col items-center justify-center bg-htb-bg-elevated border-r border-htb-border px-5 py-4 w-20 shrink-0">
          <div className="htb-mono text-[0.65rem] uppercase tracking-widest text-htb-green">
            {month}
          </div>
          <div className="htb-heading text-3xl text-htb-text leading-none">
            {day}
          </div>
        </div>
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={meta.class}>{meta.label}</span>
            <span className="htb-mono text-[0.65rem] text-htb-text-dim">
              {formatTime(event.startsAt)} utc
            </span>
          </div>
          <h3 className="htb-heading text-lg text-htb-text leading-tight">
            {event.title}
          </h3>
          <p className="htb-mono text-xs text-htb-text-muted mt-2 line-clamp-2">
            {event.description}
          </p>
          <div className="mt-3 flex items-center gap-4 htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-wider">
            <span>{event.location}</span>
            <span>·</span>
            <span className="text-htb-green">
              {event.rsvpCount.toLocaleString()} rsvp
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

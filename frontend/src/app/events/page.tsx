import { api } from "@/lib/api";
import { EventCard } from "@/components/event-card";

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

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: Event[] = [];
  try {
    events = await api.get<Event[]>("/api/events");
  } catch {
    events = [];
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; cal --show
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          Events
          <span className="text-htb-green htb-mono"> [{sorted.length}]</span>
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Workshops, CTFs, and meetups across the Cyber Club network.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </main>
  );
}

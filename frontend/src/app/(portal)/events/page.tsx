import { EventCard } from "@/components/event-card";
import { mockDb } from "@/lib/mock-data";

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
  // Events have no backend yet (portal v2); served from the in-memory mock.
  const events: Event[] = mockDb.events;

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

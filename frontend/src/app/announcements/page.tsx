import { api } from "@/lib/api";
import { AnnouncementCard } from "@/components/announcement-card";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: "info" | "alert" | "event" | "ctf";
  pinned: boolean;
  createdAt: string;
  authorId: string;
};

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  let announcements: Announcement[] = [];
  try {
    announcements = await api.get<Announcement[]>("/api/announcements");
  } catch {
    announcements = [];
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; cat /var/log/announcements
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          News & Announcements
          <span className="text-htb-green htb-mono"> [{sorted.length}]</span>
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          All official communications from the Cyber Club administration.
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} expanded />
        ))}
      </div>
    </main>
  );
}

import Link from "next/link";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: "info" | "alert" | "event" | "ctf";
  pinned: boolean;
  createdAt: string;
  authorId: string;
};

const TYPE_META: Record<Announcement["type"], { label: string; class: string }> = {
  info: { label: "info", class: "htb-badge htb-badge-cyan" },
  alert: { label: "alert", class: "htb-badge htb-badge-red" },
  event: { label: "event", class: "htb-badge htb-badge-purple" },
  ctf: { label: "ctf", class: "htb-badge htb-badge-green" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AnnouncementCard({
  announcement,
  expanded = false,
}: {
  announcement: Announcement;
  expanded?: boolean;
}) {
  const meta = TYPE_META[announcement.type];
  return (
    <article className="htb-card htb-card-interactive p-5">
      <div className="flex items-center gap-2 mb-3">
        {announcement.pinned && (
          <span className="htb-badge htb-badge-amber">★ pinned</span>
        )}
        <span className={meta.class}>{meta.label}</span>
        <span className="htb-mono text-[0.65rem] text-htb-text-dim ml-auto">
          {formatDate(announcement.createdAt)}
        </span>
      </div>

      <h3
        className={`htb-heading text-htb-text ${
          expanded ? "text-2xl" : "text-lg"
        } leading-tight`}
      >
        {announcement.title}
      </h3>

      <p
        className={`htb-mono text-sm text-htb-text-muted mt-2 ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {announcement.body}
      </p>

      {expanded && (
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="#"
            className="htb-button htb-button-ghost"
          >
            Read more →
          </Link>
        </div>
      )}
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoadmapBySlug } from "@/lib/data/learn";
import { PathCard, ProgressBar, StatusBadge } from "@/components/learn/ui";
import { MarkdownView } from "@/components/learn/markdown-view";
import type { RoadmapBySlugQuery } from "@/graphql/generated";

export const dynamic = "force-dynamic";

type RoadMap = NonNullable<RoadmapBySlugQuery["roadmap"]>;
type Item = RoadMap["items"][number];

export default async function RoadmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roadmap = await getRoadmapBySlug(slug);
  if (!roadmap) notFound();

  // items sharing a position form one step
  const steps = new Map<number, Item[]>();
  for (const it of roadmap.items) steps.set(it.position, [...(steps.get(it.position) ?? []), it]);

  // first required step that is not finished — where "continue" should point
  const current = [...steps.entries()].find(([, items]) => stepProgress(items) < 1)?.[0] ?? null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 w-full">
      <Link href="/dash" className="htb-mono text-xs text-htb-text-dim hover:text-htb-green">
        ← learn
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="htb-badge htb-badge-purple">roadmap</span>
          {roadmap.status !== "PUBLISHED" && <StatusBadge value={roadmap.status} />}
        </div>
        <h1 className="htb-heading text-3xl text-htb-text">{roadmap.title}</h1>
        <div className="htb-mono text-xs text-htb-text-dim mt-2">
          {steps.size} steps · {roadmap.items.length} items
        </div>
      </div>

      <div className="htb-card p-4 mb-8">
        <div className="flex items-center justify-between htb-mono text-xs mb-2">
          <span className="text-htb-text-muted">your progress</span>
          <span className="text-htb-text-dim">derived from your paths &amp; modules — nothing to enrol in</span>
        </div>
        <ProgressBar value={roadmap.progress} />
      </div>

      {roadmap.descriptionMd && (
        <div className="htb-card p-6 mb-8">
          <MarkdownView source={roadmap.descriptionMd} />
        </div>
      )}

      <h2 className="htb-heading text-xl text-htb-text mb-3">
        <span className="text-htb-green htb-mono">##</span> Steps
      </h2>
      <ol className="space-y-6">
        {[...steps.entries()].map(([position, items]) => {
          const choice = items[0].groupType === "CHOICE";
          const required = items.some((i) => i.isRequired);
          const p = stepProgress(items);
          const isCurrent = position === current;
          return (
            <li key={position} className={`htb-card overflow-hidden ${isCurrent ? "border-htb-green/60" : ""}`}>
              <div className="px-5 py-3 border-b border-htb-border bg-htb-bg-elevated flex items-center gap-3 flex-wrap">
                <span className={`htb-mono text-sm ${p >= 1 ? "text-htb-green" : isCurrent ? "text-htb-cyan" : "text-htb-text-dim"}`}>
                  {p >= 1 ? "✓" : String(position).padStart(2, "0")}
                </span>
                <span className="htb-mono text-xs text-htb-text-muted">
                  {choice ? `pick any one of ${items.length}` : items.length > 1 ? `complete all ${items.length}` : "step"}
                </span>
                {!required && <span className="htb-badge htb-badge-amber">optional</span>}
                {isCurrent && <span className="htb-badge htb-badge-cyan">you are here</span>}
                {required && <ProgressBar value={p} className="w-32 ml-auto" />}
              </div>
              <div className="p-4 grid gap-3 sm:grid-cols-2">
                {items.map((it) => (
                  <ItemCard key={it.id} item={it} />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

/** Same rule as learn.roadmap_progress: ALL → mean of required items, CHOICE → best required item; optional-only steps read as done. */
function stepProgress(items: Item[]): number {
  const req = items.filter((i) => i.isRequired);
  if (req.length === 0) return 1;
  if (items[0].groupType === "CHOICE") return Math.max(...req.map((i) => i.progress));
  return req.reduce((s, i) => s + i.progress, 0) / req.length;
}

function ItemCard({ item }: { item: Item }) {
  const t = item.item;
  if (t.__typename === "Path") {
    return <PathCard path={t} href={`/paths/${t.slug}`} />;
  }
  // module: reachable through any published path that includes it
  const via = t.paths[0];
  const href = via ? `/paths/${via.slug}` : null;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="htb-heading text-lg text-htb-text">{t.title}</h3>
        <span className="htb-badge htb-badge-cyan">module</span>
      </div>
      {t.descriptionMd && <p className="htb-mono text-xs text-htb-text-muted line-clamp-2">{t.descriptionMd}</p>}
      {t.myProgress && t.myProgress.status !== "DROPPED" && <ProgressBar value={t.myProgress.progress} />}
      <div className="mt-auto htb-mono text-[0.65rem] text-htb-text-dim">
        {via ? `in ${t.paths.map((p) => p.title).join(", ")}` : "not in any published path yet"}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="htb-card htb-card-interactive p-5 flex flex-col gap-3">{body}</Link>
  ) : (
    <div className="htb-card p-5 flex flex-col gap-3 opacity-70">{body}</div>
  );
}

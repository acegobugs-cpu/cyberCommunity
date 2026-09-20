import Link from "next/link";
import { notFound } from "next/navigation";
import { getPathBySlug } from "@/lib/data/learn";
import { DifficultyBadge, LessonTypeBadge, ProgressBar, StatusBadge, minutes } from "@/components/learn/ui";
import { MarkdownView } from "@/components/learn/markdown-view";
import { EnrollButton } from "@/components/learn/progress-actions";

export const dynamic = "force-dynamic";

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = await getPathBySlug(slug);
  if (!path) notFound();

  const lessonCount = path.modules.reduce((n, m) => n + m.lessons.length, 0);
  const first = path.modules.find((m) => m.lessons.length > 0)?.lessons[0];
  const enrollment = path.enrollment ?? null;
  const nextId = enrollment?.nextLessonId ?? first?.id ?? null;
  const nextHref = nextId ? `/paths/${path.slug}/lessons/${nextId}` : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 w-full">
      <Link href="/" className="htb-mono text-xs text-htb-text-dim hover:text-htb-green">
        ← all paths
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DifficultyBadge value={path.difficulty} />
            {path.status !== "PUBLISHED" && <StatusBadge value={path.status} />}
          </div>
          <h1 className="htb-heading text-3xl text-htb-text">{path.title}</h1>
          <div className="htb-mono text-xs text-htb-text-dim mt-2 flex gap-4">
            <span>{path.modules.length} modules</span>
            <span>{lessonCount} lessons</span>
            <span>{minutes(path.estimatedMinutes)}</span>
            {path.tags.map((t) => (
              <span key={t} className="text-htb-cyan">
                #{t}
              </span>
            ))}
          </div>
        </div>
        {path.status === "PUBLISHED" && (
          <EnrollButton pathId={path.id} status={enrollment?.status ?? null} nextHref={nextHref} />
        )}
      </div>

      {enrollment && enrollment.status !== "DROPPED" && (
        <div className="htb-card p-4 mb-8">
          <div className="flex items-center justify-between htb-mono text-xs mb-2">
            <span className="text-htb-text-muted">your progress</span>
            <span className={enrollment.status === "COMPLETED" ? "text-htb-green" : "text-htb-text-dim"}>
              {enrollment.status.toLowerCase()}
            </span>
          </div>
          <ProgressBar value={enrollment.progress} />
        </div>
      )}

      {path.description && (
        <div className="htb-card p-6 mb-8">
          <MarkdownView source={path.description} />
        </div>
      )}

      <h2 className="htb-heading text-xl text-htb-text mb-3">
        <span className="text-htb-green htb-mono">##</span> Syllabus
      </h2>
      <div className="space-y-4">
        {path.modules.map((m, mi) => (
          <section key={m.id} className="htb-card overflow-hidden">
            <div className="px-5 py-3 border-b border-htb-border bg-htb-bg-elevated flex items-center gap-3">
              <span className="htb-mono text-xs text-htb-text-dim">{String(mi + 1).padStart(2, "0")}</span>
              <h3 className="htb-heading text-base text-htb-text">{m.title}</h3>
              {m.myProgress && m.myProgress.status !== "DROPPED" && (
                <ProgressBar value={m.myProgress.progress} className="w-32 ml-auto" />
              )}
              <span className={`htb-mono text-[0.65rem] text-htb-text-dim ${m.myProgress ? "" : "ml-auto"}`}>{m.lessons.length} lessons</span>
            </div>
            {m.descriptionMd && (
              <div className="px-5 py-3 border-b border-htb-border">
                <MarkdownView source={m.descriptionMd} className="text-sm" />
              </div>
            )}
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/paths/${path.slug}/lessons/${l.id}`}
                    className="flex items-center gap-3 px-5 py-3 border-b border-htb-border last:border-b-0 hover:bg-htb-bg-hover"
                  >
                    <span className="htb-mono text-xs text-htb-text-dim w-8">
                      {mi + 1}.{l.position}
                    </span>
                    <span className={`htb-mono text-xs w-4 ${l.completed ? "text-htb-green" : "text-htb-text-dim"}`}>
                      {l.completed ? "✓" : "·"}
                    </span>
                    <span className={`flex-1 htb-mono text-sm ${l.completed ? "text-htb-text-muted" : "text-htb-text"}`}>{l.title}</span>
                    <LessonTypeBadge value={l.type} />
                    <span className="htb-mono text-[0.65rem] text-htb-text-dim w-14 text-right">
                      {minutes(l.estimatedMinutes)}
                    </span>
                  </Link>
                </li>
              ))}
              {m.lessons.length === 0 && (
                <li className="px-5 py-3 htb-mono text-xs text-htb-text-dim">no lessons yet</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

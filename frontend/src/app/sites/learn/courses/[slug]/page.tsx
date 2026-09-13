import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionToken } from "@/lib/server/session";
import { getCourseBySlug } from "@/lib/data/learn";
import { DifficultyBadge, LessonTypeBadge, StatusBadge, minutes } from "@/components/learn/ui";
import { MarkdownView } from "@/components/learn/markdown-view";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = await getSessionToken();
  const course = await getCourseBySlug(token, slug);
  if (!course) notFound();

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const first = course.modules.find((m) => m.lessons.length > 0)?.lessons[0];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 w-full">
      <Link href="/" className="htb-mono text-xs text-htb-text-dim hover:text-htb-green">
        ← all courses
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DifficultyBadge value={course.difficulty} />
            {course.status !== "PUBLISHED" && <StatusBadge value={course.status} />}
          </div>
          <h1 className="htb-heading text-3xl text-htb-text">{course.title}</h1>
          <div className="htb-mono text-xs text-htb-text-dim mt-2 flex gap-4">
            <span>{course.modules.length} modules</span>
            <span>{lessonCount} lessons</span>
            <span>{minutes(course.estimatedMinutes)}</span>
            {course.tags.map((t) => (
              <span key={t} className="text-htb-cyan">
                #{t}
              </span>
            ))}
          </div>
        </div>
        {first && (
          <Link href={`/courses/${course.slug}/lessons/${first.id}`} className="htb-button htb-button-primary">
            Start course <span className="htb-mono">→</span>
          </Link>
        )}
      </div>

      {course.description && (
        <div className="htb-card p-6 mb-8">
          <MarkdownView source={course.description} />
        </div>
      )}

      <h2 className="htb-heading text-xl text-htb-text mb-3">
        <span className="text-htb-green htb-mono">##</span> Syllabus
      </h2>
      <div className="space-y-4">
        {course.modules.map((m) => (
          <section key={m.id} className="htb-card overflow-hidden">
            <div className="px-5 py-3 border-b border-htb-border bg-htb-bg-elevated flex items-center gap-3">
              <span className="htb-mono text-xs text-htb-text-dim">{String(m.position).padStart(2, "0")}</span>
              <h3 className="htb-heading text-base text-htb-text">{m.title}</h3>
              <span className="ml-auto htb-mono text-[0.65rem] text-htb-text-dim">{m.lessons.length} lessons</span>
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
                    href={`/courses/${course.slug}/lessons/${l.id}`}
                    className="flex items-center gap-3 px-5 py-3 border-b border-htb-border last:border-b-0 hover:bg-htb-bg-hover"
                  >
                    <span className="htb-mono text-xs text-htb-text-dim w-8">
                      {m.position}.{l.position}
                    </span>
                    <span className="flex-1 htb-mono text-sm text-htb-text">{l.title}</span>
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

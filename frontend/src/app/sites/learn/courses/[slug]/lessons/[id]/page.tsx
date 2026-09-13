import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionToken } from "@/lib/server/session";
import { getCourseBySlug, getLesson } from "@/lib/data/learn";
import { LessonTypeBadge, minutes } from "@/components/learn/ui";
import { MarkdownView } from "@/components/learn/markdown-view";
import { VideoEmbed } from "@/components/learn/video-embed";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const token = await getSessionToken();
  const [course, lesson] = await Promise.all([getCourseBySlug(token, slug), getLesson(token, id)]);
  if (!course || !lesson) notFound();

  // flatten syllabus for prev/next
  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = flat.findIndex((l) => l.id === lesson.id);
  if (idx === -1) notFound();
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 w-full grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-20 self-start">
        <Link href={`/courses/${course.slug}`} className="htb-mono text-xs text-htb-text-dim hover:text-htb-green">
          ← {course.title}
        </Link>
        <nav className="mt-4 htb-card overflow-hidden text-sm">
          {course.modules.map((m) => (
            <div key={m.id}>
              <div className="px-4 py-2 bg-htb-bg-elevated border-b border-htb-border htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
                {m.position}. {m.title}
              </div>
              {m.lessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/courses/${course.slug}/lessons/${l.id}`}
                  className={`block px-4 py-2 border-b border-htb-border htb-mono text-xs truncate ${
                    l.id === lesson.id
                      ? "text-htb-green bg-htb-green/10"
                      : "text-htb-text-muted hover:text-htb-text hover:bg-htb-bg-hover"
                  }`}
                >
                  {l.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <article>
        <div className="flex items-center gap-3 mb-2">
          <LessonTypeBadge value={lesson.type} />
          <span className="htb-mono text-xs text-htb-text-dim">{minutes(lesson.estimatedMinutes)}</span>
          <span className="htb-mono text-xs text-htb-text-dim ml-auto">
            {idx + 1} / {flat.length}
          </span>
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mb-6">{lesson.title}</h1>

        {lesson.type === "VIDEO" && lesson.videoUrl && (
          <div className="mb-6">
            <VideoEmbed url={lesson.videoUrl} />
          </div>
        )}

        {lesson.contentMd ? (
          <div className="htb-card p-6">
            <MarkdownView source={lesson.contentMd} />
          </div>
        ) : lesson.type === "READING" ? (
          <div className="htb-card p-6 htb-mono text-xs text-htb-text-dim">this lesson has no content yet</div>
        ) : null}

        {lesson.type !== "READING" && lesson.type !== "VIDEO" && (
          <div className="htb-card border-htb-amber/40 p-4 mt-6 htb-mono text-xs text-htb-amber">
            ! {lesson.type.toLowerCase()} lessons are not playable yet (arrives in a later Learn phase)
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {prev ? (
            <Link href={`/courses/${course.slug}/lessons/${prev.id}`} className="htb-button htb-button-ghost">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/courses/${course.slug}/lessons/${next.id}`} className="htb-button htb-button-primary">
              {next.title} →
            </Link>
          ) : (
            <Link href={`/courses/${course.slug}`} className="htb-button htb-button-secondary">
              back to course
            </Link>
          )}
        </div>
      </article>
    </main>
  );
}

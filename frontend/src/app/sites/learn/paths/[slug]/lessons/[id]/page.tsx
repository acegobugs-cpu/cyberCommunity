import Link from "next/link";
import { notFound } from "next/navigation";
import { getPathBySlug, getLesson } from "@/lib/data/learn";
import { LessonTypeBadge, ProgressBar, minutes } from "@/components/learn/ui";
import { MarkdownView } from "@/components/learn/markdown-view";
import { VideoEmbed } from "@/components/learn/video-embed";
import { CompleteLessonButton } from "@/components/learn/progress-actions";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { DocTree } from "@/components/learn/doc-tree";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const [path, lesson] = await Promise.all([getPathBySlug(slug), getLesson(id)]);
  if (!path || !lesson) notFound();

  // flatten syllabus for prev/next
  const flat = path.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = flat.findIndex((l) => l.id === lesson.id);
  if (idx === -1) notFound();
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;
  const nextHref = next ? `/paths/${path.slug}/lessons/${next.id}` : null;
  const completable = lesson.type === "READING" || lesson.type === "VIDEO" || lesson.type === "PROJECT";
  const enrollment = path.enrollment && path.enrollment.status !== "DROPPED" ? path.enrollment : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 w-full grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-20 self-start">
        <Link href={`/paths/${path.slug}`} className="htb-mono text-xs text-htb-text-dim hover:text-htb-green">
          ← {path.title}
        </Link>
        {enrollment && <ProgressBar value={enrollment.progress} className="mt-3" />}
        <nav className="mt-4 htb-card overflow-hidden text-sm">
          {path.modules.map((m, mi) => (
            <div key={m.id}>
              <div className="px-4 py-2 bg-htb-bg-elevated border-b border-htb-border htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
                {mi + 1}. {m.title}
              </div>
              {m.lessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/paths/${path.slug}/lessons/${l.id}`}
                  className={`flex items-center gap-2 px-4 py-2 border-b border-htb-border htb-mono text-xs ${
                    l.id === lesson.id
                      ? "text-htb-green bg-htb-green/10"
                      : "text-htb-text-muted hover:text-htb-text hover:bg-htb-bg-hover"
                  }`}
                >
                  <span className={l.completed ? "text-htb-green" : "text-htb-text-dim"}>{l.completed ? "✓" : "·"}</span>
                  <span className="truncate">{l.title}</span>
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

        {lesson.type === "PROJECT" && (
          <div className="htb-card border-htb-purple/40 p-4 mb-6 htb-mono text-xs text-htb-text-muted">
            <span className="text-htb-purple">project</span> — build this on your own machine, in your own repo. The spec is below; when you are done, mark it complete.
            Want feedback or to show it off? Post it in the community.
          </div>
        )}

        {lesson.contentMd ? (
          <div className="htb-card p-6">
            <MarkdownView source={lesson.contentMd} />
          </div>
        ) : lesson.type === "READING" || (lesson.type === "PROJECT" && lesson.docs.length === 0) ? (
          <div className="htb-card p-6 htb-mono text-xs text-htb-text-dim">this lesson has no content yet</div>
        ) : null}

        {lesson.docs.length > 0 && (
          <div className={lesson.contentMd ? "mt-6" : ""}>
            <DocTree docs={lesson.docs} />
          </div>
        )}

        {lesson.type === "QUIZ" &&
          (lesson.quiz ? (
            <div className={lesson.contentMd ? "mt-6" : ""}>
              <QuizRunner quiz={lesson.quiz} pathId={path.id} nextHref={nextHref} completed={lesson.completed} />
            </div>
          ) : (
            <div className="htb-card border-htb-amber/40 p-4 mt-6 htb-mono text-xs text-htb-amber">! this quiz has not been built yet</div>
          ))}

        {lesson.type !== "READING" && lesson.type !== "VIDEO" && lesson.type !== "QUIZ" && lesson.type !== "PROJECT" && (
          <div className="htb-card border-htb-amber/40 p-4 mt-6 htb-mono text-xs text-htb-amber">
            ! {lesson.type.toLowerCase()} lessons are not playable yet (arrives in a later Learn phase)
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {prev ? (
            <Link href={`/paths/${path.slug}/lessons/${prev.id}`} className="htb-button htb-button-ghost">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {completable && path.status === "PUBLISHED" ? (
            <CompleteLessonButton
              lessonId={lesson.id}
              pathId={path.id}
              completed={lesson.completed}
              nextHref={nextHref}
              label={lesson.type === "PROJECT" ? "I built it" : "Mark complete"}
            />
          ) : null}
          {(!completable || lesson.completed) && (nextHref ? (
            <Link href={nextHref} className="htb-button htb-button-secondary">
              {next!.title} →
            </Link>
          ) : (
            <Link href={`/paths/${path.slug}`} className="htb-button htb-button-secondary">
              back to path
            </Link>
          ))}
        </div>
      </article>
    </main>
  );
}

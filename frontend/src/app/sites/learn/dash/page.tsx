import Link from "next/link";
import { getSessionToken } from "@/lib/server/session";
import { getCatalogue } from "@/lib/data/learn";
import { CourseCard } from "@/components/learn/ui";
import type { Difficulty } from "@/graphql/generated";

export const metadata = { title: "Learn — Cyber Club Portal" };
export const dynamic = "force-dynamic";

const DIFFICULTIES: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default async function LearnCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; tag?: string; q?: string }>;
}) {
  const params = await searchParams;
  const difficulty = DIFFICULTIES.includes(params.difficulty as Difficulty)
    ? (params.difficulty as Difficulty)
    : undefined;

  const token = await getSessionToken();
  const { courses, error } = await getCatalogue({
    difficulty,
    tag: params.tag || undefined,
    search: params.q || undefined,
  });

  const tags = Array.from(new Set(courses.flatMap((c) => c.tags))).sort();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 w-full">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
            &gt; ls ./courses
          </div>
          <h1 className="htb-heading text-3xl text-htb-text mt-1">
            Learning Tracks
            <span className="text-htb-green htb-mono"> [{courses.length}]</span>
          </h1>
          <p className="htb-mono text-sm text-htb-text-muted mt-2">
            Structured courses: modules of readings and videos. Roadmaps, quizzes and labs arrive in later phases.
          </p>
        </div>
        <form className="flex items-center gap-2" action="/">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="search…"
            className="htb-input !w-48"
          />
          <select name="difficulty" defaultValue={difficulty ?? ""} className="htb-input !w-40">
            <option value="">any level</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.toLowerCase()}
              </option>
            ))}
          </select>
          <button className="htb-button htb-button-secondary">filter</button>
        </form>
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 htb-mono text-xs">
          <Link
            href="/"
            className={`px-2 py-1 rounded ${!params.tag ? "text-htb-green bg-htb-green/10" : "text-htb-text-muted hover:text-htb-text"}`}
          >
            all
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className={`px-2 py-1 rounded ${params.tag === t ? "text-htb-green bg-htb-green/10" : "text-htb-text-muted hover:text-htb-text"}`}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {error && (
        <div className="htb-card border-htb-amber/40 p-4 mb-6 htb-mono text-xs text-htb-amber">
          ! {error}
        </div>
      )}

      {courses.length === 0 && !error && (
        <div className="htb-card p-10 text-center htb-mono text-xs text-htb-text-dim">
          no published courses match — authors can create some in{" "}
          <Link href="/admin" className="text-htb-green">
            /admin
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} href={`/courses/${c.slug}`} />
        ))}
      </div>
    </main>
  );
}
import Link from "next/link";
import { getCatalogue, getMyEnrollments, getMyRoadmaps, getRoadmaps } from "@/lib/data/learn";
import { PathCard, ProgressBar, RoadMapCard } from "@/components/learn/ui";
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

  const [{ paths, error }, enrollments, roadmaps, myRoadmaps] = await Promise.all([
    getCatalogue({
      difficulty,
      tag: params.tag || undefined,
      search: params.q || undefined,
    }),
    getMyEnrollments(),
    getRoadmaps(),
    getMyRoadmaps(),
  ]);
  const inProgress = enrollments.filter((p) => p.enrollment?.status === "ENROLLED");
  const mineIds = new Set(myRoadmaps.map((r) => r.id));
  const otherRoadmaps = roadmaps.filter((r) => !mineIds.has(r.id));

  const tags = Array.from(new Set(paths.flatMap((c) => c.tags))).sort();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 w-full">
      {myRoadmaps.length > 0 && (
        <section className="mb-10">
          <h2 className="htb-heading text-xl text-htb-text mb-1">
            <span className="text-htb-green htb-mono">##</span> Your roadmaps
          </h2>
          <p className="htb-mono text-xs text-htb-text-dim mb-3">Worked out from the paths and modules you have already started — nothing to enrol in.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myRoadmaps.map((r) => (
              <RoadMapCard key={r.id} roadmap={r} href={`/roadmaps/${r.slug}`} />
            ))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="htb-heading text-xl text-htb-text mb-3">
            <span className="text-htb-green htb-mono">##</span> Continue
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((p) => {
              const e = p.enrollment!;
              const href = e.nextLessonId ? `/paths/${p.slug}/lessons/${e.nextLessonId}` : `/paths/${p.slug}`;
              return (
                <Link key={p.id} href={href} className="htb-card htb-card-interactive p-4 flex flex-col gap-2">
                  <div className="htb-mono text-sm text-htb-text truncate">{p.title}</div>
                  <ProgressBar value={e.progress} />
                  <div className="htb-mono text-[0.65rem] text-htb-green">resume →</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
            &gt; ls ./paths
          </div>
          <h1 className="htb-heading text-3xl text-htb-text mt-1">
            Learning Tracks
            <span className="text-htb-green htb-mono"> [{paths.length}]</span>
          </h1>
          <p className="htb-mono text-sm text-htb-text-muted mt-2">
            Structured paths: modules of readings and videos. Follow a roadmap to see how they chain together.
          </p>
        </div>
        <form className="flex items-center gap-2" action="/dash">
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
            href="/dash"
            className={`px-2 py-1 rounded ${!params.tag ? "text-htb-green bg-htb-green/10" : "text-htb-text-muted hover:text-htb-text"}`}
          >
            all
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/dash?tag=${encodeURIComponent(t)}`}
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

      {paths.length === 0 && !error && (
        <div className="htb-card p-10 text-center htb-mono text-xs text-htb-text-dim">
          no published paths match — authors can create some in{" "}
          <Link href="/admin" className="text-htb-green">
            /admin
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paths.map((c) => (
          <PathCard key={c.id} path={c} href={`/paths/${c.slug}`} />
        ))}
      </div>

      {otherRoadmaps.length > 0 && (
        <section className="mt-12">
          <h2 className="htb-heading text-xl text-htb-text mb-1">
            <span className="text-htb-green htb-mono">##</span> Roadmaps
            <span className="text-htb-green htb-mono text-base"> [{otherRoadmaps.length}]</span>
          </h2>
          <p className="htb-mono text-xs text-htb-text-dim mb-3">Curated sequences of paths and modules. Pick one and follow it step by step.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherRoadmaps.map((r) => (
              <RoadMapCard key={r.id} roadmap={r} href={`/roadmaps/${r.slug}`} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
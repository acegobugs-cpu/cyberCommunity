"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAreaUrl } from "@/lib/use-area-url";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import { CATALOGUE, UPSERT_PATH } from "@/graphql/learn-documents";
import type { CatalogueQuery, UpsertPathMutation, UpsertPathMutationVariables } from "@/graphql/generated";
import { DifficultyBadge, StatusBadge, minutes } from "@/components/learn/ui";

type PathRow = CatalogueQuery["paths"][number];

export default function LearnAdminPage() {
  const router = useRouter();
  const areaHref = useAreaUrl();
  const { user, loading: authLoading } = useAuth();
  const [paths, setPaths] = useState<PathRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.assign(areaHref("portal", "/signin"));
      return;
    }
    learnMutate<CatalogueQuery, Record<string, never>>(CATALOGUE, {})
      .then((d) => setPaths(d.paths))
      .catch((e) => setError(e instanceof Error ? e.message : "failed to load"));
  }, [user, authLoading, areaHref]);

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const d = await learnMutate<UpsertPathMutation, UpsertPathMutationVariables>(UPSERT_PATH, {
        input: { title: title.trim() },
      });
      router.push(`/admin/paths/${d.upsertPath.id}`);
    } catch (e) {
      setError(e instanceof LearnApiError ? `${e.classification}: ${e.message}` : "create failed");
      setCreating(false);
    }
  }

  if (authLoading || !user) {
    return <Centered>loading…</Centered>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">&gt; ./learn-admin --tree</div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">Content</h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Paths → modules → lessons. Drafts are invisible to learners until published. Creating and editing
          requires the <span className="text-htb-green">ADMIN</span> role in the learn service.
        </p>
      </div>

      <div className="htb-card p-4 mb-6 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="new path title…"
          className="htb-input flex-1"
        />
        <button onClick={create} disabled={creating || !title.trim()} className="htb-button htb-button-primary disabled:opacity-50">
          {creating ? "creating…" : "Create draft"}
        </button>
      </div>

      {error && <div className="htb-card border-htb-red/40 p-3 mb-6 htb-mono text-xs text-htb-red">! {error}</div>}

      <div className="htb-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-htb-border bg-htb-bg-elevated htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
          <div className="col-span-5">path</div>
          <div className="col-span-2">status</div>
          <div className="col-span-2">level</div>
          <div className="col-span-2 text-right">length</div>
          <div className="col-span-1 text-right">updated</div>
        </div>
        {paths === null && <div className="px-5 py-8 htb-mono text-xs text-htb-text-dim animate-htb-pulse">loading…</div>}
        {paths?.map((c) => (
          <Link
            key={c.id}
            href={`/admin/paths/${c.id}`}
            className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b border-htb-border last:border-b-0 hover:bg-htb-bg-hover"
          >
            <div className="col-span-5 min-w-0">
              <div className="htb-mono text-sm text-htb-text truncate">{c.title}</div>
              <div className="htb-mono text-[0.65rem] text-htb-text-dim truncate">/{c.slug}</div>
            </div>
            <div className="col-span-2">
              <StatusBadge value={c.status} />
            </div>
            <div className="col-span-2">
              <DifficultyBadge value={c.difficulty} />
            </div>
            <div className="col-span-2 htb-mono text-xs text-htb-text-muted text-right">{minutes(c.estimatedMinutes)}</div>
            <div className="col-span-1 htb-mono text-[0.65rem] text-htb-text-dim text-right">
              {new Date(c.updatedAt).toLocaleDateString()}
            </div>
          </Link>
        ))}
        {paths?.length === 0 && (
          <div className="px-5 py-8 text-center htb-mono text-xs text-htb-text-dim">no paths yet — create the first one above</div>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="htb-mono text-sm text-htb-text-dim">{children}</div>
    </main>
  );
}

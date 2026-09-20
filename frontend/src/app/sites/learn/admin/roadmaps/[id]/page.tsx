"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAreaUrl } from "@/lib/use-area-url";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import {
  ARCHIVE_ROADMAP,
  CATALOGUE,
  DELETE_ROADMAP,
  MODULE_PICKER,
  PUBLISH_ROADMAP,
  ROADMAP_BY_ID,
  SET_ROADMAP_ITEMS,
  UPSERT_ROADMAP,
} from "@/graphql/learn-documents";
import type {
  CatalogueQuery,
  GroupType,
  ModulePickerQuery,
  RoadmapByIdQuery,
  RoadMapItemInput,
  SetRoadmapItemsMutation,
  SetRoadmapItemsMutationVariables,
  UpsertRoadmapMutation,
  UpsertRoadmapMutationVariables,
} from "@/graphql/generated";
import { MarkdownEditor } from "@/components/learn/markdown-editor";
import { StatusBadge } from "@/components/learn/ui";

type RoadMap = NonNullable<RoadmapByIdQuery["roadmapById"]>;
type PathRow = CatalogueQuery["paths"][number];
type ModuleRow = ModulePickerQuery["modules"][number];

/** Local, editable shape: one entry per step; items point at a path or a module. */
type DraftItem = { key: string; pathId?: string; moduleId?: string; title: string; kind: "path" | "module"; required: boolean; status?: string };
type DraftStep = { key: string; groupType: GroupType; items: DraftItem[] };

function describe(e: unknown): string {
  if (e instanceof LearnApiError) return `${e.classification}: ${e.message}`;
  return e instanceof Error ? e.message : "request failed";
}

let seq = 0;
const nextKey = () => `k${++seq}`;

function toDraft(r: RoadMap): DraftStep[] {
  const byPos = new Map<number, DraftStep>();
  for (const it of r.items) {
    const step = byPos.get(it.position) ?? { key: nextKey(), groupType: it.groupType, items: [] };
    byPos.set(it.position, step);
    if (it.item.__typename === "Path") {
      step.items.push({ key: nextKey(), pathId: it.item.id, title: it.item.title, kind: "path", required: it.isRequired, status: it.item.status });
    } else {
      step.items.push({ key: nextKey(), moduleId: it.item.id, title: it.item.title, kind: "module", required: it.isRequired });
    }
  }
  return [...byPos.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

function toInput(steps: DraftStep[]): RoadMapItemInput[] {
  return steps.flatMap((s, i) =>
    s.items.map((it) => ({
      position: i + 1,
      groupType: s.groupType,
      isRequired: it.required,
      pathId: it.pathId ?? null,
      moduleId: it.moduleId ?? null,
    })),
  );
}

export default function RoadmapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const areaHref = useAreaUrl();
  const { user, loading: authLoading } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadMap | null>(null);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await learnMutate<RoadmapByIdQuery, { id: string }>(ROADMAP_BY_ID, { id });
    if (!d.roadmapById) {
      setError("roadmap not found");
      return;
    }
    setRoadmap(d.roadmapById);
    setSteps(toDraft(d.roadmapById));
    setDirty(false);
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.assign(areaHref("portal", "/signin"));
      return;
    }
    let active = true;
    learnMutate<RoadmapByIdQuery, { id: string }>(ROADMAP_BY_ID, { id })
      .then((d) => {
        if (!active) return;
        if (!d.roadmapById) {
          setError("roadmap not found");
          return;
        }
        setRoadmap(d.roadmapById);
        setSteps(toDraft(d.roadmapById));
      })
      .catch((e) => active && setError(describe(e)));
    learnMutate<CatalogueQuery, Record<string, never>>(CATALOGUE, {}).then((d) => active && setPaths(d.paths)).catch(() => {});
    learnMutate<ModulePickerQuery, Record<string, never>>(MODULE_PICKER, {}).then((d) => active && setModules(d.modules)).catch(() => {});
    return () => {
      active = false;
    };
  }, [user, authLoading, areaHref, id]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(`✓ ${label}`);
      await load();
    } catch (e) {
      setError(describe(e));
    }
  }

  function edit(mutator: (s: DraftStep[]) => DraftStep[]) {
    setSteps((s) => mutator(s));
    setDirty(true);
  }

  const usedPaths = useMemo(() => new Set(steps.flatMap((s) => s.items.map((i) => i.pathId).filter(Boolean))), [steps]);
  const usedModules = useMemo(() => new Set(steps.flatMap((s) => s.items.map((i) => i.moduleId).filter(Boolean))), [steps]);

  if (authLoading || !user) return <Centered>loading…</Centered>;
  if (!roadmap) return <Centered>{error ?? "loading roadmap…"}</Centered>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="flex items-center gap-3 mb-6 htb-mono text-xs">
        <Link href="/admin" className="text-htb-text-dim hover:text-htb-green">← content</Link>
        <span className="text-htb-text-dim">/</span>
        <span className="text-htb-text truncate">{roadmap.title}</span>
        <StatusBadge value={roadmap.status} />
        {roadmap.status === "PUBLISHED" && (
          <Link href={`/roadmaps/${roadmap.slug}`} className="ml-auto text-htb-green">view as learner →</Link>
        )}
      </div>

      {error && <Banner tone="red">! {error}</Banner>}
      {notice && <Banner tone="green">{notice}</Banner>}

      <Meta
        roadmap={roadmap}
        onSave={(input) =>
          run("roadmap saved", () =>
            learnMutate<UpsertRoadmapMutation, UpsertRoadmapMutationVariables>(UPSERT_ROADMAP, { input: { id: roadmap.id, ...input } }),
          )
        }
      />

      <div className="flex items-center gap-2 my-6">
        {roadmap.status !== "PUBLISHED" && roadmap.status !== "ARCHIVED" && (
          <button className="htb-button htb-button-primary" onClick={() => run("published", () => learnMutate(PUBLISH_ROADMAP, { id: roadmap.id, published: true }))}>
            Publish
          </button>
        )}
        {roadmap.status === "PUBLISHED" && (
          <button className="htb-button htb-button-secondary" onClick={() => run("returned to draft", () => learnMutate(PUBLISH_ROADMAP, { id: roadmap.id, published: false }))}>
            Unpublish
          </button>
        )}
        {roadmap.status !== "ARCHIVED" && (
          <button className="htb-button htb-button-danger ml-auto" onClick={() => confirm("Archive this roadmap?") && run("archived", () => learnMutate(ARCHIVE_ROADMAP, { id: roadmap.id }))}>
            Archive
          </button>
        )}
        <button
          className="htb-button htb-button-ghost text-htb-red"
          onClick={async () => {
            if (!confirm(`Delete roadmap "${roadmap.title}"? Paths and modules are not affected.`)) return;
            try {
              await learnMutate(DELETE_ROADMAP, { id: roadmap.id });
              router.push("/admin");
            } catch (e) {
              setError(describe(e));
            }
          }}
        >
          delete
        </button>
      </div>

      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="htb-heading text-xl text-htb-text">
          <span className="text-htb-green htb-mono">##</span> Steps
        </h2>
        <div className="flex items-center gap-2">
          {dirty && <span className="htb-mono text-xs text-htb-amber">unsaved changes</span>}
          <button className="htb-button htb-button-ghost" disabled={!dirty} onClick={() => { setSteps(toDraft(roadmap)); setDirty(false); }}>
            reset
          </button>
          <button
            className="htb-button htb-button-primary disabled:opacity-50"
            disabled={!dirty}
            onClick={() =>
              run("steps saved", () =>
                learnMutate<SetRoadmapItemsMutation, SetRoadmapItemsMutationVariables>(SET_ROADMAP_ITEMS, {
                  roadmapId: roadmap.id,
                  items: toInput(steps),
                }),
              )
            }
          >
            Save steps
          </button>
        </div>
      </div>
      <p className="htb-mono text-xs text-htb-text-dim mb-4">
        A step is one or more items. <span className="text-htb-text">ALL</span> = every required item counts; <span className="text-htb-text">CHOICE</span> = the best one counts.
        Items marked optional never move the percentage. Learners only see items whose path is published.
      </p>

      <ol className="space-y-4">
        {steps.map((s, si) => (
          <li key={s.key} className="htb-card overflow-hidden">
            <div className="px-4 py-3 border-b border-htb-border bg-htb-bg-elevated flex items-center gap-2 flex-wrap">
              <MoveButtons index={si} count={steps.length} onMove={(dir) => edit((all) => swap(all, si, si + dir))} />
              <span className="htb-mono text-xs text-htb-text-dim">{String(si + 1).padStart(2, "0")}</span>
              <select
                value={s.groupType}
                onChange={(e) => edit((all) => all.map((x, i) => (i === si ? { ...x, groupType: e.target.value as GroupType } : x)))}
                className="htb-input !w-36 !py-1"
              >
                <option value="ALL">ALL — complete every item</option>
                <option value="CHOICE">CHOICE — pick any one</option>
              </select>
              <span className="htb-mono text-[0.65rem] text-htb-text-dim">{s.items.length} item{s.items.length === 1 ? "" : "s"}</span>
              <button className="htb-button htb-button-ghost !py-1 text-htb-red ml-auto" onClick={() => edit((all) => all.filter((_, i) => i !== si))}>
                remove step
              </button>
            </div>
            <ul>
              {s.items.map((it, ii) => (
                <li key={it.key} className="flex items-center gap-3 px-4 py-2 border-b border-htb-border">
                  <span className={`htb-badge ${it.kind === "path" ? "htb-badge-green" : "htb-badge-cyan"}`}>{it.kind}</span>
                  <span className="flex-1 htb-mono text-sm text-htb-text truncate">{it.title}</span>
                  {it.status && it.status !== "PUBLISHED" && <StatusBadge value={it.status as PathRow["status"]} />}
                  <label className="htb-mono text-xs text-htb-text-muted flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={it.required}
                      onChange={(e) =>
                        edit((all) => all.map((x, i) => (i === si ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, required: e.target.checked } : y)) } : x)))
                      }
                    />
                    required
                  </label>
                  <button
                    className="htb-button htb-button-ghost !py-1 text-htb-red"
                    onClick={() => edit((all) => all.map((x, i) => (i === si ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)))}
                  >
                    ×
                  </button>
                </li>
              ))}
              <li className="px-4 py-2 flex items-center gap-2 flex-wrap">
                <Picker
                  label="+ path"
                  options={paths.filter((p) => !usedPaths.has(p.id) && p.status !== "ARCHIVED").map((p) => ({ id: p.id, label: `${p.title}${p.status !== "PUBLISHED" ? ` (${p.status.toLowerCase()})` : ""}` }))}
                  onPick={(pid) => {
                    const p = paths.find((x) => x.id === pid)!;
                    edit((all) => all.map((x, i) => (i === si ? { ...x, items: [...x.items, { key: nextKey(), pathId: p.id, title: p.title, kind: "path", required: true, status: p.status }] } : x)));
                  }}
                />
                <Picker
                  label="+ module"
                  options={modules.filter((m) => !usedModules.has(m.id)).map((m) => ({ id: m.id, label: m.title }))}
                  onPick={(mid) => {
                    const m = modules.find((x) => x.id === mid)!;
                    edit((all) => all.map((x, i) => (i === si ? { ...x, items: [...x.items, { key: nextKey(), moduleId: m.id, title: m.title, kind: "module", required: true }] } : x)));
                  }}
                />
              </li>
            </ul>
          </li>
        ))}
        <li>
          <button className="htb-card htb-card-interactive p-4 w-full htb-mono text-sm text-htb-text-muted" onClick={() => edit((all) => [...all, { key: nextKey(), groupType: "ALL", items: [] }])}>
            + add step
          </button>
        </li>
      </ol>
    </main>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// ---------------------------------------------------------------- meta

function Meta({
  roadmap,
  onSave,
}: {
  roadmap: RoadMap;
  onSave: (input: { title: string; slug: string; descriptionMd: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(roadmap.title);
  const [slug, setSlug] = useState(roadmap.slug);
  const [descriptionMd, setDescriptionMd] = useState(roadmap.descriptionMd ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = title !== roadmap.title || slug !== roadmap.slug || descriptionMd !== (roadmap.descriptionMd ?? "");

  return (
    <section className="htb-card p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="htb-input" />
        </Field>
        <Field label="slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="htb-input htb-mono" />
        </Field>
      </div>
      <Field label="description (markdown)">
        <MarkdownEditor value={descriptionMd} onChange={setDescriptionMd} rows={5} placeholder="Who is this roadmap for, and where does it lead?" />
      </Field>
      <div className="flex justify-end">
        <button
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, slug, descriptionMd });
            setSaving(false);
          }}
          className="htb-button htb-button-primary disabled:opacity-50"
        >
          {saving ? "saving…" : "Save roadmap"}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- bits

function Picker({ label, options, onPick }: { label: string; options: { id: string; label: string }[]; onPick: (id: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      disabled={options.length === 0}
      className="htb-input !w-56 !py-1 disabled:opacity-50"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

function MoveButtons({ index, count, onMove }: { index: number; count: number; onMove: (dir: -1 | 1) => void }) {
  return (
    <span className="flex flex-col">
      <button disabled={index === 0} onClick={() => onMove(-1)} className="htb-mono text-[0.6rem] leading-none text-htb-text-dim hover:text-htb-green disabled:opacity-20">▲</button>
      <button disabled={index === count - 1} onClick={() => onMove(1)} className="htb-mono text-[0.6rem] leading-none text-htb-text-dim hover:text-htb-green disabled:opacity-20">▼</button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block htb-mono text-[0.65rem] uppercase tracking-widest text-htb-text-dim mb-1">{label}</span>
      {children}
    </label>
  );
}

function Banner({ tone, children }: { tone: "red" | "green"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-htb-red/40 text-htb-red" : "border-htb-green/40 text-htb-green";
  return <div className={`htb-card p-3 mb-4 htb-mono text-xs ${cls}`}>{children}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="htb-mono text-sm text-htb-text-dim">{children}</div>
    </main>
  );
}

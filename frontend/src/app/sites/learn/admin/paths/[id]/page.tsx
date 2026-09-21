"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAreaUrl } from "@/lib/use-area-url";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import {
  ADD_MODULE_TO_PATH,
  ARCHIVE_PATH,
  PATH_BY_ID,
  DELETE_LESSON,
  DELETE_MODULE,
  LESSON_BY_ID,
  MODULE_PICKER,
  PUBLISH_PATH,
  REMOVE_MODULE_FROM_PATH,
  REORDER_LESSONS,
  REORDER_MODULES,
  UPSERT_PATH,
  UPSERT_LESSON,
  UPSERT_MODULE,
} from "@/graphql/learn-documents";
import type {
  PathByIdQuery,
  Difficulty,
  LessonType,
  ModulePickerQuery,
  UpsertLessonMutation,
  UpsertLessonMutationVariables,
  UpsertModuleMutation,
  UpsertModuleMutationVariables,
} from "@/graphql/generated";
import { MarkdownEditor } from "@/components/learn/markdown-editor";
import { QuizBuilder } from "@/components/learn/quiz-builder";
import { LessonTypeBadge, StatusBadge, minutes } from "@/components/learn/ui";

type Path = NonNullable<PathByIdQuery["pathById"]>;
type Module = Path["modules"][number];
type Lesson = Module["lessons"][number];

const DIFFICULTIES: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const LESSON_TYPES: LessonType[] = ["READING", "VIDEO", "QUIZ", "LAB", "PROJECT"];

function describe(e: unknown): string {
  if (e instanceof LearnApiError) return `${e.classification}: ${e.message}`;
  return e instanceof Error ? e.message : "request failed";
}

export default function PathEditorPage() {
  const { id } = useParams<{ id: string }>();
  const areaHref = useAreaUrl();
  const { user, loading: authLoading } = useAuth();
  const [path, setPath] = useState<Path | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const d = await learnMutate<PathByIdQuery, { id: string }>(PATH_BY_ID, { id });
      if (!d.pathById) setError("path not found");
      setPath(d.pathById);
    } catch (e) {
      setError(describe(e));
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.assign(areaHref("portal", "/signin"));
      return;
    }
    let active = true;
    learnMutate<PathByIdQuery, { id: string }>(PATH_BY_ID, { id })
      .then((d) => {
        if (!active) return;
        if (!d.pathById) setError("path not found");
        setPath(d.pathById);
      })
      .catch((e) => active && setError(describe(e)));
    return () => {
      active = false;
    };
  }, [user, authLoading, areaHref, id]);

  /** Runs a mutation, surfaces errors, reloads the tree. */
  async function run(label: string, fn: () => Promise<unknown>) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(`✓ ${label}`);
      await reload();
    } catch (e) {
      setError(describe(e));
    }
  }

  if (authLoading || !user) return <Centered>loading…</Centered>;
  if (!path) return <Centered>{error ?? "loading path…"}</Centered>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="flex items-center gap-3 mb-6 htb-mono text-xs">
        <Link href="/admin" className="text-htb-text-dim hover:text-htb-green">← content</Link>
        <span className="text-htb-text-dim">/</span>
        <span className="text-htb-text truncate">{path.title}</span>
        <StatusBadge value={path.status} />
        {path.status === "PUBLISHED" && (
          <Link href={`/paths/${path.slug}`} className="ml-auto text-htb-green">view as learner →</Link>
        )}
      </div>

      {error && <Banner tone="red">! {error}</Banner>}
      {notice && <Banner tone="green">{notice}</Banner>}

      <PathMeta path={path} onSave={(input) => run("path saved", () => learnMutate(UPSERT_PATH, { input: { id: path.id, ...input } }))} />

      <div className="flex items-center gap-2 my-6">
        {path.status !== "PUBLISHED" && path.status !== "ARCHIVED" && (
          <button className="htb-button htb-button-primary" onClick={() => run("published", () => learnMutate(PUBLISH_PATH, { id: path.id, published: true }))}>
            Publish
          </button>
        )}
        {path.status === "PUBLISHED" && (
          <button className="htb-button htb-button-secondary" onClick={() => run("returned to draft", () => learnMutate(PUBLISH_PATH, { id: path.id, published: false }))}>
            Unpublish
          </button>
        )}
        {path.status !== "ARCHIVED" && (
          <button className="htb-button htb-button-danger ml-auto" onClick={() => confirm("Archive this path? Learners will no longer see it.") && run("archived", () => learnMutate(ARCHIVE_PATH, { id: path.id }))}>
            Archive
          </button>
        )}
        <span className="htb-mono text-xs text-htb-text-dim">{minutes(path.estimatedMinutes)} total</span>
      </div>

      <h2 className="htb-heading text-xl text-htb-text mb-3">
        <span className="text-htb-green htb-mono">##</span> Modules
      </h2>
      <div className="space-y-4">
        {path.modules.map((m, i) => (
          <ModuleEditor
            key={m.id}
            module={m}
            index={i}
            count={path.modules.length}
            onMove={(dir) => {
              const ids = path.modules.map((x) => x.id);
              const j = i + dir;
              [ids[i], ids[j]] = [ids[j], ids[i]];
              return run("modules reordered", () => learnMutate(REORDER_MODULES, { pathId: path.id, orderedIds: ids }));
            }}
            onSave={(input) => run("module saved", () => learnMutate<UpsertModuleMutation, UpsertModuleMutationVariables>(UPSERT_MODULE, { input: { id: m.id, ...input } }))}
            onRemove={() => confirm(`Remove "${m.title}" from this path? The module and its lessons stay available to other paths.`) && run("module removed from path", () => learnMutate(REMOVE_MODULE_FROM_PATH, { pathId: path.id, moduleId: m.id }))}
            onDelete={() => confirm(`Delete module "${m.title}" and its lessons from EVERY path that uses it?`) && run("module deleted", () => learnMutate(DELETE_MODULE, { id: m.id }))}
            onLessonMove={(li, dir) => {
              const ids = m.lessons.map((x) => x.id);
              const j = li + dir;
              [ids[li], ids[j]] = [ids[j], ids[li]];
              return run("lessons reordered", () => learnMutate(REORDER_LESSONS, { moduleId: m.id, orderedIds: ids }));
            }}
            onLessonSave={(input) => run("lesson saved", () => learnMutate<UpsertLessonMutation, UpsertLessonMutationVariables>(UPSERT_LESSON, { input: { moduleId: m.id, ...input } }))}
            onLessonDelete={(l) => confirm(`Delete lesson "${l.title}"?`) && run("lesson deleted", () => learnMutate(DELETE_LESSON, { id: l.id }))}
          />
        ))}
        <NewModule onCreate={(title) => run("module added", () => learnMutate(UPSERT_MODULE, { input: { pathId: path.id, title } }))} />
        <ExistingModulePicker
          exclude={path.modules.map((m) => m.id)}
          onAdd={(moduleId) => run("module added to path", () => learnMutate(ADD_MODULE_TO_PATH, { pathId: path.id, moduleId }))}
        />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- path meta

function PathMeta({
  path,
  onSave,
}: {
  path: Path;
  onSave: (input: { title: string; slug: string; description: string; difficulty: Difficulty; tags: string[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState(path.title);
  const [slug, setSlug] = useState(path.slug);
  const [description, setDescription] = useState(path.description ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(path.difficulty);
  const [tags, setTags] = useState(path.tags.join(", "));
  const [saving, setSaving] = useState(false);

  const dirty =
    title !== path.title ||
    slug !== path.slug ||
    description !== (path.description ?? "") ||
    difficulty !== path.difficulty ||
    tags !== path.tags.join(", ");

  return (
    <section className="htb-card p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="htb-input" />
        </Field>
        <Field label="slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="htb-input htb-mono" />
        </Field>
        <Field label="difficulty">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="htb-input">
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d.toLowerCase()}</option>
            ))}
          </select>
        </Field>
        <Field label="tags (comma separated)">
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="htb-input htb-mono" placeholder="web, xss, beginner" />
        </Field>
      </div>
      <Field label="description (markdown)">
        <MarkdownEditor value={description} onChange={setDescription} rows={6} placeholder="What will learners be able to do after this path?" />
      </Field>
      <div className="flex justify-end">
        <button
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ title, slug, description, difficulty, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
            setSaving(false);
          }}
          className="htb-button htb-button-primary disabled:opacity-50"
        >
          {saving ? "saving…" : "Save path"}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- module

function ModuleEditor({
  module: m,
  index,
  count,
  onMove,
  onSave,
  onRemove,
  onDelete,
  onLessonMove,
  onLessonSave,
  onLessonDelete,
}: {
  module: Module;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => Promise<void>;
  onSave: (input: { title: string; descriptionMd: string }) => Promise<void>;
  onRemove: () => void;
  onDelete: () => void;
  onLessonMove: (lessonIndex: number, dir: -1 | 1) => Promise<void>;
  onLessonSave: (input: LessonForm & { id?: string }) => Promise<void>;
  onLessonDelete: (l: Lesson) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [desc, setDesc] = useState(m.descriptionMd ?? "");
  const [editingLesson, setEditingLesson] = useState<Lesson | "new" | null>(null);
  const [quizFor, setQuizFor] = useState<string | null>(null);

  return (
    <section className="htb-card overflow-hidden">
      <div className="px-4 py-3 border-b border-htb-border bg-htb-bg-elevated flex items-center gap-2">
        <MoveButtons index={index} count={count} onMove={onMove} />
        <span className="htb-mono text-xs text-htb-text-dim">{String(index + 1).padStart(2, "0")}</span>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="htb-input flex-1 !py-1" />
        ) : (
          <h3 className="htb-heading text-base text-htb-text flex-1">{m.title}</h3>
        )}
        {editing ? (
          <>
            <button className="htb-button htb-button-primary !py-1" onClick={async () => { await onSave({ title, descriptionMd: desc }); setEditing(false); }}>save</button>
            <button className="htb-button htb-button-ghost !py-1" onClick={() => { setEditing(false); setTitle(m.title); setDesc(m.descriptionMd ?? ""); }}>cancel</button>
          </>
        ) : (
          <>
            <button className="htb-button htb-button-ghost !py-1" onClick={() => setEditing(true)}>edit</button>
            <button className="htb-button htb-button-ghost !py-1" onClick={onRemove} title="Unlink from this path only">remove</button>
            <button className="htb-button htb-button-ghost !py-1 text-htb-red" onClick={onDelete} title="Delete from every path">delete</button>
          </>
        )}
      </div>
      {editing && (
        <div className="p-4 border-b border-htb-border">
          <MarkdownEditor value={desc} onChange={setDesc} rows={4} placeholder="module intro (markdown)" />
        </div>
      )}

      <ul>
        {m.lessons.map((l, li) => (
          <li key={l.id} className="border-b border-htb-border last:border-b-0">
            {editingLesson !== "new" && editingLesson?.id === l.id ? (
              <LessonEditor
                initial={l}
                onCancel={() => setEditingLesson(null)}
                onSave={async (input) => { await onLessonSave({ id: l.id, ...input }); setEditingLesson(null); }}
              />
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 hover:bg-htb-bg-hover">
                  <MoveButtons index={li} count={m.lessons.length} onMove={(dir) => onLessonMove(li, dir)} />
                  <span className="htb-mono text-xs text-htb-text-dim w-10">{index + 1}.{l.position}</span>
                  <span className="flex-1 htb-mono text-sm text-htb-text truncate">{l.title}</span>
                  <LessonTypeBadge value={l.type} />
                  <span className="htb-mono text-[0.65rem] text-htb-text-dim w-14 text-right">{minutes(l.estimatedMinutes)}</span>
                  {l.type === "QUIZ" && (
                    <button
                      className={`htb-button htb-button-ghost !py-1 ${quizFor === l.id ? "text-htb-green" : ""}`}
                      onClick={() => setQuizFor(quizFor === l.id ? null : l.id)}
                    >
                      {quizFor === l.id ? "close quiz" : "quiz"}
                    </button>
                  )}
                  <button className="htb-button htb-button-ghost !py-1" onClick={() => setEditingLesson(l)}>edit</button>
                  <button className="htb-button htb-button-ghost !py-1 text-htb-red" onClick={() => onLessonDelete(l)}>×</button>
                </div>
                {l.type === "QUIZ" && quizFor === l.id && <QuizBuilder lessonId={l.id} />}
              </>
            )}
          </li>
        ))}
        <li className="px-4 py-2">
          {editingLesson === "new" ? (
            <LessonEditor
              onCancel={() => setEditingLesson(null)}
              onSave={async (input) => { await onLessonSave(input); setEditingLesson(null); }}
            />
          ) : (
            <button className="htb-button htb-button-ghost !py-1" onClick={() => setEditingLesson("new")}>+ add lesson</button>
          )}
        </li>
      </ul>
    </section>
  );
}

function NewModule({ onCreate }: { onCreate: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  return (
    <div className="htb-card p-4 flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={async (e) => { if (e.key === "Enter" && title.trim()) { await onCreate(title.trim()); setTitle(""); } }}
        placeholder="new module title…"
        className="htb-input flex-1"
      />
      <button
        disabled={!title.trim()}
        onClick={async () => { await onCreate(title.trim()); setTitle(""); }}
        className="htb-button htb-button-secondary disabled:opacity-50"
      >
        + Add module
      </button>
    </div>
  );
}

/** Reuse a module that already exists in another path. */
function ExistingModulePicker({ exclude, onAdd }: { exclude: string[]; onAdd: (moduleId: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ModulePickerQuery["modules"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(() => {
      learnMutate<ModulePickerQuery, { search?: string }>(MODULE_PICKER, { search: search || undefined })
        .then((d) => active && setOptions(d.modules))
        .catch((e) => active && setError(describe(e)));
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, search]);

  if (!open) {
    return (
      <button className="htb-button htb-button-ghost" onClick={() => setOpen(true)}>
        + Add existing module
      </button>
    );
  }

  const visible = (options ?? []).filter((m) => !exclude.includes(m.id));
  return (
    <div className="htb-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search modules…" className="htb-input flex-1" autoFocus />
        <button className="htb-button htb-button-ghost" onClick={() => setOpen(false)}>close</button>
      </div>
      {error && <div className="htb-mono text-xs text-htb-red">! {error}</div>}
      {options === null ? (
        <div className="htb-mono text-xs text-htb-text-dim">loading…</div>
      ) : visible.length === 0 ? (
        <div className="htb-mono text-xs text-htb-text-dim">no other modules</div>
      ) : (
        <ul className="max-h-64 overflow-y-auto divide-y divide-htb-border">
          {visible.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 htb-mono text-sm text-htb-text truncate">{m.title}</span>
              <button className="htb-button htb-button-secondary !py-1" onClick={() => onAdd(m.id)}>add</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- lesson

type LessonForm = { title: string; type: LessonType; contentMd: string; videoUrl: string; estimatedMinutes: number };

function LessonEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Lesson & { contentMd?: string | null; videoUrl?: string | null };
  onSave: (input: LessonForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<LessonForm>({
    title: initial?.title ?? "",
    type: initial?.type ?? "READING",
    contentMd: initial?.contentMd ?? "",
    videoUrl: initial?.videoUrl ?? "",
    estimatedMinutes: initial?.estimatedMinutes ?? 10,
  });
  const [loaded, setLoaded] = useState(!initial);
  const [saving, setSaving] = useState(false);

  // The tree query only carries summaries; fetch the body when editing an existing lesson.
  useEffect(() => {
    if (!initial || loaded) return;
    learnMutate<{ lesson: { contentMd: string | null; videoUrl: string | null } | null }, { id: string }>(LESSON_BY_ID, { id: initial.id })
      .then((d) => {
        setForm((f) => ({ ...f, contentMd: d.lesson?.contentMd ?? "", videoUrl: d.lesson?.videoUrl ?? "" }));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [initial, loaded]);

  const set = <K extends keyof LessonForm>(k: K, v: LessonForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-4 space-y-3 bg-htb-bg-elevated/50">
      <div className="grid gap-3 md:grid-cols-[1fr_140px_100px]">
        <Field label="title">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className="htb-input" />
        </Field>
        <Field label="type">
          <select value={form.type} onChange={(e) => set("type", e.target.value as LessonType)} className="htb-input">
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>{t.toLowerCase()}</option>
            ))}
          </select>
        </Field>
        <Field label="minutes">
          <input type="number" min={0} value={form.estimatedMinutes} onChange={(e) => set("estimatedMinutes", Number(e.target.value))} className="htb-input" />
        </Field>
      </div>
      {form.type === "VIDEO" && (
        <Field label="video url (YouTube, Vimeo or direct file)">
          <input value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} className="htb-input htb-mono" placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
      )}
      {(form.type === "READING" || form.type === "VIDEO") ? (
        <Field label={form.type === "VIDEO" ? "notes (markdown)" : "content (markdown)"}>
          {loaded ? (
            <MarkdownEditor value={form.contentMd} onChange={(v) => set("contentMd", v)} />
          ) : (
            <div className="htb-mono text-xs text-htb-text-dim animate-htb-pulse">loading content…</div>
          )}
        </Field>
      ) : (
        <div className="htb-mono text-xs text-htb-amber">! {form.type.toLowerCase()} details (questions / lab / brief) are authored in a later phase; the lesson is created as a placeholder.</div>
      )}
      <div className="flex justify-end gap-2">
        <button className="htb-button htb-button-ghost" onClick={onCancel}>cancel</button>
        <button
          disabled={saving || !form.title.trim()}
          className="htb-button htb-button-primary disabled:opacity-50"
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
        >
          {saving ? "saving…" : "Save lesson"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bits

function MoveButtons({ index, count, onMove }: { index: number; count: number; onMove: (dir: -1 | 1) => Promise<void> }) {
  return (
    <span className="flex flex-col htb-mono text-[0.6rem] leading-none text-htb-text-dim">
      <button disabled={index === 0} onClick={() => onMove(-1)} className="hover:text-htb-green disabled:opacity-20" aria-label="move up">▲</button>
      <button disabled={index === count - 1} onClick={() => onMove(1)} className="hover:text-htb-green disabled:opacity-20" aria-label="move down">▼</button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="htb-label">{label}</span>
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

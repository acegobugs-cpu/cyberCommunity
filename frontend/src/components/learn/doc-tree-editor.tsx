"use client";

import { useEffect, useState } from "react";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import { LESSON_BY_ID, SET_LESSON_DOCS } from "@/graphql/learn-documents";
import type { LessonByIdQuery, LessonDocFieldsFragment, LessonDocKind, SetLessonDocsMutation, SetLessonDocsMutationVariables } from "@/graphql/generated";
import { MarkdownEditor } from "@/components/learn/markdown-editor";

type Doc = LessonDocFieldsFragment;
type Draft = { key: string; path: string; kind: LessonDocKind; title: string; contentMd: string; videoUrl: string };

let seq = 0;
const k = () => `d${++seq}`;

function describe(e: unknown): string {
  if (e instanceof LearnApiError) return `${e.classification}: ${e.message}`;
  return e instanceof Error ? e.message : "request failed";
}

function fromDocs(docs: Doc[]): Draft[] {
  return docs.map((d) => ({ key: k(), path: d.path, kind: d.kind, title: d.title, contentMd: d.contentMd ?? "", videoUrl: d.videoUrl ?? "" }));
}

function normalise(p: string): string {
  return p.trim().replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "");
}

/** Client-side mirror of LessonService.setDocs validation. */
function problems(docs: Draft[]): string[] {
  const out: string[] = [];
  const paths = docs.map((d) => normalise(d.path));
  docs.forEach((d, i) => {
    const p = paths[i];
    if (!p) out.push(`row ${i + 1}: path is empty`);
    else if (p.includes("..")) out.push(`${p}: ".." is not allowed`);
    if (!d.title.trim()) out.push(`${p || `row ${i + 1}`}: title is empty`);
    if (d.kind === "DOC" && !d.contentMd.trim()) out.push(`${p}: DOC needs content`);
    if (d.kind === "VIDEO" && !d.videoUrl.trim()) out.push(`${p}: VIDEO needs a URL`);
    if (paths.indexOf(p) !== i) out.push(`${p}: duplicate path`);
    if (paths.some((q) => q.startsWith(p + "/"))) out.push(`${p}: is both a file and a folder`);
  });
  return Array.from(new Set(out));
}

/**
 * Author-side editor for a lesson's document tree (project specs, tutorial
 * video series, appendices). Flat list of rows with a slash-separated path;
 * the learner-facing viewer folds them into folders. Saved as one replace-all.
 */
export function DocTreeEditor({ lessonId }: { lessonId: string }) {
  const [initial, setInitial] = useState<Doc[] | null>(null);
  const [docs, setDocs] = useState<Draft[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    learnMutate<LessonByIdQuery, { id: string }>(LESSON_BY_ID, { id: lessonId })
      .then((d) => {
        if (!active) return;
        const list = d.lesson?.docs ?? [];
        setInitial(list);
        setDocs(fromDocs(list));
      })
      .catch((e) => active && setError(describe(e)));
    return () => {
      active = false;
    };
  }, [lessonId]);

  if (initial === null) return <div className="p-4 htb-mono text-xs text-htb-text-dim">{error ?? "loading documents…"}</div>;

  const issues = problems(docs);

  function edit(fn: (d: Draft[]) => Draft[]) {
    setDocs((d) => fn(d));
    setDirty(true);
    setNotice(null);
  }

  function update(key: string, patch: Partial<Draft>) {
    edit((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function move(i: number, dir: -1 | 1) {
    edit((all) => {
      const j = i + dir;
      if (j < 0 || j >= all.length) return all;
      const out = [...all];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const d = await learnMutate<SetLessonDocsMutation, SetLessonDocsMutationVariables>(SET_LESSON_DOCS, {
        lessonId,
        docs: docs.map((x) => ({
          path: normalise(x.path),
          kind: x.kind,
          title: x.title.trim(),
          contentMd: x.contentMd.trim() ? x.contentMd : null,
          videoUrl: x.videoUrl.trim() ? x.videoUrl.trim() : null,
        })),
      });
      setInitial(d.setLessonDocs.docs);
      setDocs(fromDocs(d.setLessonDocs.docs));
      setDirty(false);
      setNotice("✓ documents saved");
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3 bg-htb-bg-elevated/40">
      <div className="flex items-center gap-3 flex-wrap htb-mono text-xs">
        <span className="uppercase tracking-widest text-htb-text-dim">documents</span>
        <span className="text-htb-text-dim">
          {docs.length} file{docs.length === 1 ? "" : "s"} · paths like <code className="text-htb-text">setup/01-gateway.md</code> become folders
        </span>
      </div>

      <ul className="space-y-1">
        {docs.map((d, i) => {
          const open = openKey === d.key;
          return (
            <li key={d.key} className="htb-card">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="flex flex-col">
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="htb-mono text-[0.6rem] leading-none text-htb-text-dim hover:text-htb-green disabled:opacity-20">▲</button>
                  <button disabled={i === docs.length - 1} onClick={() => move(i, 1)} className="htb-mono text-[0.6rem] leading-none text-htb-text-dim hover:text-htb-green disabled:opacity-20">▼</button>
                </span>
                <select value={d.kind} onChange={(e) => update(d.key, { kind: e.target.value as LessonDocKind })} className="htb-input !w-24 !py-1">
                  <option value="DOC">doc</option>
                  <option value="VIDEO">video</option>
                </select>
                <input
                  value={d.path}
                  onChange={(e) => update(d.key, { path: e.target.value })}
                  placeholder="folder/file.md"
                  className="htb-input htb-mono flex-1 !py-1"
                />
                <input value={d.title} onChange={(e) => update(d.key, { title: e.target.value })} placeholder="title" className="htb-input flex-1 !py-1" />
                <button className="htb-button htb-button-ghost !py-1" onClick={() => setOpenKey(open ? null : d.key)}>
                  {open ? "close" : "edit"}
                </button>
                <button className="htb-button htb-button-ghost !py-1 text-htb-red" onClick={() => edit((all) => all.filter((x) => x.key !== d.key))}>
                  ×
                </button>
              </div>
              {open && (
                <div className="px-3 pb-3 space-y-2 border-t border-htb-border pt-3">
                  {d.kind === "VIDEO" && (
                    <input
                      value={d.videoUrl}
                      onChange={(e) => update(d.key, { videoUrl: e.target.value })}
                      placeholder="https://youtu.be/… or direct video URL"
                      className="htb-input htb-mono !py-1"
                    />
                  )}
                  <MarkdownEditor
                    value={d.contentMd}
                    onChange={(v) => update(d.key, { contentMd: v })}
                    rows={d.kind === "VIDEO" ? 3 : 10}
                    placeholder={d.kind === "VIDEO" ? "notes shown under the video (optional)" : "document body (markdown)"}
                  />
                </div>
              )}
            </li>
          );
        })}
        <li className="flex gap-2">
          <button className="htb-button htb-button-ghost !py-1" onClick={() => edit((all) => [...all, { key: k(), path: "", kind: "DOC", title: "", contentMd: "", videoUrl: "" }])}>
            + document
          </button>
          <button className="htb-button htb-button-ghost !py-1" onClick={() => edit((all) => [...all, { key: k(), path: "videos/", kind: "VIDEO", title: "", contentMd: "", videoUrl: "" }])}>
            + video
          </button>
        </li>
      </ul>

      {issues.length > 0 && dirty && (
        <ul className="htb-mono text-xs text-htb-amber space-y-0.5">
          {issues.map((p) => (
            <li key={p}>! {p}</li>
          ))}
        </ul>
      )}
      {error && <div className="htb-mono text-xs text-htb-red">! {error}</div>}
      {notice && <div className="htb-mono text-xs text-htb-green">{notice}</div>}

      <div className="flex items-center justify-end gap-2">
        {dirty && <span className="htb-mono text-xs text-htb-amber">unsaved</span>}
        <button className="htb-button htb-button-ghost" disabled={!dirty} onClick={() => { setDocs(fromDocs(initial)); setDirty(false); }}>
          reset
        </button>
        <button className="htb-button htb-button-primary disabled:opacity-50" disabled={busy || !dirty || issues.length > 0} onClick={save}>
          {busy ? "saving…" : "Save documents"}
        </button>
      </div>
    </div>
  );
}

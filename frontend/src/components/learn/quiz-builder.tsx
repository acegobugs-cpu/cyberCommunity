"use client";

import { useEffect, useState } from "react";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import { LESSON_BY_ID, UPSERT_QUIZ } from "@/graphql/learn-documents";
import type { LessonByIdQuery, QuestionKind, QuizFieldsFragment, UpsertQuizMutation, UpsertQuizMutationVariables } from "@/graphql/generated";
import { MarkdownEditor } from "@/components/learn/markdown-editor";

type Draft = {
  passScore: number;
  shuffle: boolean;
  questions: { key: string; promptMd: string; kind: QuestionKind; points: number; options: { key: string; textMd: string; correct: boolean }[] }[];
};

let seq = 0;
const k = () => `q${++seq}`;

function describe(e: unknown): string {
  if (e instanceof LearnApiError) return `${e.classification}: ${e.message}`;
  return e instanceof Error ? e.message : "request failed";
}

function fromQuiz(q: QuizFieldsFragment | null | undefined): Draft {
  if (!q) return { passScore: 70, shuffle: true, questions: [blankQuestion()] };
  return {
    passScore: q.passScore,
    shuffle: q.shuffle,
    questions: q.questions.map((x) => ({
      key: k(),
      promptMd: x.promptMd,
      kind: x.kind,
      points: x.points,
      options: x.options.map((o) => ({ key: k(), textMd: o.textMd, correct: o.correct ?? false })),
    })),
  };
}

function blankQuestion(): Draft["questions"][number] {
  return { key: k(), promptMd: "", kind: "SINGLE", points: 1, options: [{ key: k(), textMd: "", correct: true }, { key: k(), textMd: "", correct: false }] };
}

/** Client-side mirror of QuizService.upsert validation so authors get instant feedback. */
function problems(d: Draft): string[] {
  const out: string[] = [];
  if (d.passScore < 0 || d.passScore > 100) out.push("pass mark must be 0..100");
  if (d.questions.length === 0) out.push("add at least one question");
  d.questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.promptMd.trim()) out.push(`question ${n}: prompt is empty`);
    if (q.points < 1) out.push(`question ${n}: points must be ≥ 1`);
    if (q.options.length < 2) out.push(`question ${n}: needs at least two options`);
    if (q.options.some((o) => !o.textMd.trim())) out.push(`question ${n}: an option is empty`);
    const correct = q.options.filter((o) => o.correct).length;
    if (q.kind === "SINGLE" && correct !== 1) out.push(`question ${n}: SINGLE needs exactly one correct option`);
    if (q.kind === "MULTI" && correct < 1) out.push(`question ${n}: MULTI needs at least one correct option`);
  });
  return out;
}

/**
 * Author-side quiz editor for one QUIZ lesson. Loads the current quiz (with
 * the answer key — the caller is an author), edits locally, saves the full
 * payload with upsertQuiz. Shows attempt counters so the author can see use.
 */
export function QuizBuilder({ lessonId, onSaved }: { lessonId: string; onSaved?: () => void }) {
  const [quiz, setQuiz] = useState<QuizFieldsFragment | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    learnMutate<LessonByIdQuery, { id: string }>(LESSON_BY_ID, { id: lessonId })
      .then((d) => {
        if (!active) return;
        setQuiz(d.lesson?.quiz ?? null);
        setDraft(fromQuiz(d.lesson?.quiz));
      })
      .catch((e) => active && setError(describe(e)));
    return () => {
      active = false;
    };
  }, [lessonId]);

  if (quiz === undefined || !draft) return <div className="p-4 htb-mono text-xs text-htb-text-dim">{error ?? "loading quiz…"}</div>;

  const issues = problems(draft);

  function edit(fn: (d: Draft) => Draft) {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
    setNotice(null);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const d = await learnMutate<UpsertQuizMutation, UpsertQuizMutationVariables>(UPSERT_QUIZ, {
        input: {
          lessonId,
          passScore: draft.passScore,
          shuffle: draft.shuffle,
          questions: draft.questions.map((q) => ({
            promptMd: q.promptMd,
            kind: q.kind,
            points: q.points,
            options: q.options.map((o) => ({ textMd: o.textMd, correct: o.correct })),
          })),
        },
      });
      setQuiz(d.upsertQuiz);
      setDraft(fromQuiz(d.upsertQuiz));
      setDirty(false);
      setNotice("✓ quiz saved");
      onSaved?.();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4 bg-htb-bg-elevated/40">
      <div className="flex items-center gap-4 flex-wrap htb-mono text-xs">
        <span className="uppercase tracking-widest text-htb-text-dim">quiz builder</span>
        {quiz ? (
          <span className="text-htb-text-dim">
            {quiz.attemptCount ?? 0} attempt{quiz.attemptCount === 1 ? "" : "s"} · {quiz.passedCount ?? 0} passed
          </span>
        ) : (
          <span className="text-htb-amber">no quiz yet — the path cannot be published until this is saved</span>
        )}
        <label className="flex items-center gap-2 ml-auto">
          pass mark
          <input
            type="number"
            min={0}
            max={100}
            value={draft.passScore}
            onChange={(e) => edit((d) => ({ ...d, passScore: Number(e.target.value) }))}
            className="htb-input !w-20 !py-1"
          />
          %
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.shuffle} onChange={(e) => edit((d) => ({ ...d, shuffle: e.target.checked }))} />
          shuffle
        </label>
      </div>

      <ol className="space-y-3">
        {draft.questions.map((q, qi) => (
          <li key={q.key} className="htb-card p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap htb-mono text-xs">
              <span className="text-htb-text-dim">Q{qi + 1}</span>
              <select
                value={q.kind}
                onChange={(e) => {
                  const kind = e.target.value as QuestionKind;
                  edit((d) => ({
                    ...d,
                    questions: d.questions.map((x, i) => {
                      if (i !== qi) return x;
                      // switching to SINGLE keeps only the first correct option
                      let seen = false;
                      const options = kind === "SINGLE" ? x.options.map((o) => { const c = o.correct && !seen; if (o.correct) seen = true; return { ...o, correct: c }; }) : x.options;
                      return { ...x, kind, options };
                    }),
                  }));
                }}
                className="htb-input !w-36 !py-1"
              >
                <option value="SINGLE">SINGLE — one answer</option>
                <option value="MULTI">MULTI — all that apply</option>
              </select>
              <label className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={(e) => edit((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, points: Number(e.target.value) } : x)) }))}
                  className="htb-input !w-16 !py-1"
                />
                pt
              </label>
              <span className="ml-auto flex gap-1">
                <button disabled={qi === 0} className="htb-button htb-button-ghost !py-1 disabled:opacity-30" onClick={() => edit((d) => ({ ...d, questions: swap(d.questions, qi, qi - 1) }))}>▲</button>
                <button disabled={qi === draft.questions.length - 1} className="htb-button htb-button-ghost !py-1 disabled:opacity-30" onClick={() => edit((d) => ({ ...d, questions: swap(d.questions, qi, qi + 1) }))}>▼</button>
                <button className="htb-button htb-button-ghost !py-1 text-htb-red" onClick={() => edit((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== qi) }))}>remove</button>
              </span>
            </div>

            <MarkdownEditor
              value={q.promptMd}
              onChange={(v) => edit((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, promptMd: v } : x)) }))}
              rows={3}
              placeholder="question prompt (markdown)"
            />

            <ul className="space-y-1">
              {q.options.map((o, oi) => (
                <li key={o.key} className="flex items-center gap-2">
                  <input
                    type={q.kind === "MULTI" ? "checkbox" : "radio"}
                    name={`correct-${q.key}`}
                    checked={o.correct}
                    title="correct"
                    onChange={(e) =>
                      edit((d) => ({
                        ...d,
                        questions: d.questions.map((x, i) =>
                          i !== qi
                            ? x
                            : {
                                ...x,
                                options: x.options.map((y, j) =>
                                  q.kind === "SINGLE" ? { ...y, correct: j === oi } : j === oi ? { ...y, correct: e.target.checked } : y,
                                ),
                              },
                        ),
                      }))
                    }
                  />
                  <input
                    value={o.textMd}
                    onChange={(e) => edit((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, options: x.options.map((y, j) => (j === oi ? { ...y, textMd: e.target.value } : y)) } : x)) }))}
                    placeholder={`option ${oi + 1}`}
                    className={`htb-input flex-1 !py-1 ${o.correct ? "border-htb-green/60" : ""}`}
                  />
                  <button
                    disabled={q.options.length <= 2}
                    className="htb-button htb-button-ghost !py-1 text-htb-red disabled:opacity-30"
                    onClick={() => edit((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, options: x.options.filter((_, j) => j !== oi) } : x)) }))}
                  >
                    ×
                  </button>
                </li>
              ))}
              <li>
                <button
                  className="htb-button htb-button-ghost !py-1"
                  onClick={() => edit((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, options: [...x.options, { key: k(), textMd: "", correct: false }] } : x)) }))}
                >
                  + option
                </button>
              </li>
            </ul>
          </li>
        ))}
        <li>
          <button className="htb-button htb-button-ghost" onClick={() => edit((d) => ({ ...d, questions: [...d.questions, blankQuestion()] }))}>
            + add question
          </button>
        </li>
      </ol>

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
        <button className="htb-button htb-button-ghost" disabled={!dirty} onClick={() => { setDraft(fromQuiz(quiz)); setDirty(false); }}>
          reset
        </button>
        <button className="htb-button htb-button-primary disabled:opacity-50" disabled={busy || !dirty || issues.length > 0} onClick={save}>
          {busy ? "saving…" : quiz ? "Save quiz" : "Create quiz"}
        </button>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

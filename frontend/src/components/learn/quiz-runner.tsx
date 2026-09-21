"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import { SUBMIT_QUIZ } from "@/graphql/learn-documents";
import type { QuizFieldsFragment, SubmitQuizMutation, SubmitQuizMutationVariables } from "@/graphql/generated";
import { MarkdownView } from "@/components/learn/markdown-view";
import { ProgressBar } from "@/components/learn/ui";

type Quiz = QuizFieldsFragment;
type Result = SubmitQuizMutation["submitQuiz"];

function describe(e: unknown): string {
  if (e instanceof LearnApiError) return `${e.classification}: ${e.message}`;
  return e instanceof Error ? e.message : "request failed";
}

/** Deterministic per-mount shuffle so a re-render does not reorder answers under the learner. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One question per step, radio (SINGLE) or checkboxes (MULTI), submit at the
 * end → score, pass/fail, per-question outcome, retry. A pass completes the
 * lesson server-side; we refresh so the syllabus tick and progress update.
 */
export function QuizRunner({
  quiz,
  pathId,
  nextHref,
  completed,
}: {
  quiz: Quiz;
  pathId: string;
  nextHref: string | null;
  completed: boolean;
}) {
  const router = useRouter();
  // seed comes from useState's lazy initialiser so the impure call runs once, not during render
  const [seed] = useState(() => Math.floor(Math.random() * 233280));
  const questions = useMemo(
    () =>
      (quiz.shuffle ? shuffled(quiz.questions, seed) : quiz.questions).map((q) => ({
        ...q,
        options: quiz.shuffle ? shuffled(q.options, seed + q.position) : q.options,
      })),
    [quiz, seed],
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const q = questions[step];
  const chosen = answers[q?.id] ?? [];
  const answered = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;
  const totalPoints = quiz.questions.reduce((s, x) => s + x.points, 0);

  function toggle(optionId: string) {
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.kind === "SINGLE") return { ...a, [q.id]: [optionId] };
      return { ...a, [q.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const d = await learnMutate<SubmitQuizMutation, SubmitQuizMutationVariables>(SUBMIT_QUIZ, {
        quizId: quiz.id,
        pathId,
        answers: questions.map((x) => ({ questionId: x.id, optionIds: answers[x.id] ?? [] })),
      });
      setResult(d.submitQuiz);
      if (d.submitQuiz.passed) router.refresh();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setStep(0);
    setShowIntro(false);
  }

  // ---------------------------------------------------------------- result screen

  if (result) {
    const byQ = new Map(result.results.map((r) => [r.questionId, r]));
    return (
      <div className="htb-card p-6 space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`htb-heading text-4xl ${result.passed ? "text-htb-green" : "text-htb-red"}`}>{result.score}%</div>
          <div>
            <div className={`htb-mono text-sm ${result.passed ? "text-htb-green" : "text-htb-red"}`}>
              {result.passed ? "passed" : "not yet"} · {quiz.passScore}% needed
            </div>
            <div className="htb-mono text-xs text-htb-text-dim">
              {result.results.reduce((s, r) => s + r.pointsEarned, 0)} / {totalPoints} points ·{" "}
              {result.results.filter((r) => r.correct).length} / {result.results.length} questions
            </div>
          </div>
          <ProgressBar value={result.score / 100} className="w-full sm:w-64 sm:ml-auto" />
        </div>

        <ol className="divide-y divide-htb-border">
          {quiz.questions.map((x, i) => {
            const r = byQ.get(x.id);
            return (
              <li key={x.id} className="py-3 flex items-start gap-3">
                <span className={`htb-mono text-sm w-5 ${r?.correct ? "text-htb-green" : "text-htb-red"}`}>{r?.correct ? "✓" : "✗"}</span>
                <div className="flex-1 min-w-0">
                  <div className="htb-mono text-xs text-htb-text-dim mb-1">
                    question {i + 1} · {r?.pointsEarned ?? 0}/{x.points} pt
                  </div>
                  <MarkdownView source={x.promptMd} className="text-sm" />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="htb-mono text-xs text-htb-text-dim">
            attempt {quiz.myAttemptCount + 1}
            {quiz.myBestAttempt && ` · best so far ${Math.max(quiz.myBestAttempt.score, result.score)}%`}
          </span>
          <div className="flex gap-2">
            {!result.passed && (
              <button className="htb-button htb-button-primary" onClick={retry}>
                try again
              </button>
            )}
            {result.passed &&
              (nextHref ? (
                <a href={nextHref} className="htb-button htb-button-primary">
                  next lesson →
                </a>
              ) : (
                <button className="htb-button htb-button-secondary" onClick={retry}>
                  retake
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- intro

  if (showIntro) {
    const best = quiz.myBestAttempt;
    return (
      <div className="htb-card p-6 space-y-4">
        <div className="htb-mono text-xs text-htb-text-dim uppercase tracking-widest">&gt; ./quiz --start</div>
        <div className="grid gap-3 sm:grid-cols-3 htb-mono text-sm">
          <Stat label="questions" value={String(quiz.questions.length)} />
          <Stat label="pass mark" value={`${quiz.passScore}%`} />
          <Stat label="your attempts" value={String(quiz.myAttemptCount)} />
        </div>
        {best && (
          <div className="flex items-center gap-3">
            <span className="htb-mono text-xs text-htb-text-muted">best attempt</span>
            <ProgressBar value={best.score / 100} className="flex-1" />
            <span className={`htb-mono text-xs ${best.passed ? "text-htb-green" : "text-htb-text-dim"}`}>{best.passed ? "passed" : "not passed"}</span>
          </div>
        )}
        <p className="htb-mono text-xs text-htb-text-muted">
          Single-answer questions show radio buttons, multi-answer show checkboxes — pick <em>every</em> correct option; there is no partial credit.
          You can retake as often as you like; your best score counts.
        </p>
        <button className="htb-button htb-button-primary" onClick={() => setShowIntro(false)}>
          {completed ? "retake quiz" : quiz.myAttemptCount > 0 ? "try again" : "start quiz"}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- question

  return (
    <div className="htb-card p-6 space-y-5">
      <div className="flex items-center gap-3 htb-mono text-xs text-htb-text-dim">
        <span>
          question {step + 1} / {questions.length}
        </span>
        <span>·</span>
        <span>{q.points} pt</span>
        <span className={`htb-badge ${q.kind === "MULTI" ? "htb-badge-purple" : "htb-badge-cyan"} ml-auto`}>
          {q.kind === "MULTI" ? "select all that apply" : "select one"}
        </span>
      </div>
      <ProgressBar value={answered / questions.length} label={false} />

      <MarkdownView source={q.promptMd} />

      <ul className="space-y-2">
        {q.options.map((o) => {
          const on = chosen.includes(o.id);
          return (
            <li key={o.id}>
              <label
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                  on ? "border-htb-green bg-htb-green/10" : "border-htb-border hover:bg-htb-bg-hover"
                }`}
              >
                <input
                  type={q.kind === "MULTI" ? "checkbox" : "radio"}
                  name={q.id}
                  checked={on}
                  onChange={() => toggle(o.id)}
                  className="mt-1 accent-[var(--htb-green,#9fef00)]"
                />
                <span className="flex-1 min-w-0">
                  <MarkdownView source={o.textMd} className="text-sm" />
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {error && <div className="htb-mono text-xs text-htb-red">! {error}</div>}

      <div className="flex items-center justify-between gap-3">
        <button className="htb-button htb-button-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          ← previous
        </button>
        <div className="flex gap-1">
          {questions.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full ${i === step ? "bg-htb-green" : (answers[x.id] ?? []).length ? "bg-htb-cyan" : "bg-htb-border-bright"}`}
              aria-label={`question ${i + 1}`}
            />
          ))}
        </div>
        {step < questions.length - 1 ? (
          <button className="htb-button htb-button-secondary" onClick={() => setStep((s) => s + 1)}>
            next →
          </button>
        ) : (
          <button className="htb-button htb-button-primary disabled:opacity-50" disabled={busy} onClick={submit}>
            {busy ? "grading…" : answered < questions.length ? `submit (${questions.length - answered} unanswered)` : "submit"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="htb-card p-3">
      <div className="text-[0.65rem] uppercase tracking-widest text-htb-text-dim">{label}</div>
      <div className="text-htb-text text-lg">{value}</div>
    </div>
  );
}

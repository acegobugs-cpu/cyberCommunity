"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { learnMutate } from "@/lib/learn/client";
import { LearnApiError } from "@/lib/learn/graphql";
import { COMPLETE_LESSON, DROP_PATH, ENROLL } from "@/graphql/learn-documents";
import type {
  CompleteLessonMutation,
  DropPathMutation,
  EnrollMutation,
  EnrollmentStatus,
} from "@/graphql/generated";

function describe(e: unknown) {
  return e instanceof LearnApiError ? e.message : e instanceof Error ? e.message : "request failed";
}

/** Enroll / drop for a path. `nextHref` is where "Continue" goes once enrolled. */
export function EnrollButton({
  pathId,
  status,
  nextHref,
}: {
  pathId: string;
  status: EnrollmentStatus | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(doc: string, vars: object) {
    setBusy(true);
    setError(null);
    try {
      await learnMutate<T, object>(doc, vars);
      router.refresh();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  const enrolled = status === "ENROLLED" || status === "COMPLETED";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {enrolled && nextHref && (
          <a href={nextHref} className="htb-button htb-button-primary">
            {status === "COMPLETED" ? "Review" : "Continue"} <span className="htb-mono">→</span>
          </a>
        )}
        {enrolled && status === "COMPLETED" && !nextHref && (
          <span className="htb-badge htb-badge-green">✓ completed</span>
        )}
        {!enrolled && (
          <button
            disabled={busy}
            onClick={() => run<EnrollMutation>(ENROLL, { pathId })}
            className="htb-button htb-button-primary disabled:opacity-50"
          >
            {busy ? "…" : status === "DROPPED" ? "Re-enroll" : "Enroll"} <span className="htb-mono">→</span>
          </button>
        )}
        {enrolled && (
          <button
            disabled={busy}
            onClick={() => confirm("Drop this path? Your completed lessons are kept.") && run<DropPathMutation>(DROP_PATH, { pathId })}
            className="htb-button htb-button-ghost text-htb-text-dim disabled:opacity-50"
            title="leave this path"
          >
            drop
          </button>
        )}
      </div>
      {error && <span className="htb-mono text-xs text-htb-red">! {error}</span>}
    </div>
  );
}

/** "Mark complete" for READING / VIDEO lessons; auto-advances to `nextHref`. `pathId` = the path being browsed (modules are shared). */
export function CompleteLessonButton({
  lessonId,
  pathId,
  completed,
  nextHref,
}: {
  lessonId: string;
  pathId: string;
  completed: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      await learnMutate<CompleteLessonMutation, { lessonId: string; pathId: string }>(COMPLETE_LESSON, { lessonId, pathId });
      if (nextHref) router.push(nextHref);
      else router.refresh();
    } catch (e) {
      setError(describe(e));
      setBusy(false);
    }
  }

  if (completed) {
    return (
      <span className="htb-badge htb-badge-green">
        ✓ completed
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <button disabled={busy} onClick={complete} className="htb-button htb-button-primary disabled:opacity-50">
        {busy ? "saving…" : nextHref ? "Mark complete & continue" : "Mark complete"} <span className="htb-mono">✓</span>
      </button>
      {error && <span className="htb-mono text-xs text-htb-red">! {error}</span>}
    </div>
  );
}

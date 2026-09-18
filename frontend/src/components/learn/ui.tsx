import Link from "next/link";
import type { PathStatus, Difficulty, LessonType } from "@/graphql/generated";

export const DIFFICULTY_TONE: Record<Difficulty, string> = {
  BEGINNER: "htb-badge-green",
  INTERMEDIATE: "htb-badge-amber",
  ADVANCED: "htb-badge-red",
};

export const LESSON_TONE: Record<LessonType, string> = {
  READING: "htb-badge-green",
  VIDEO: "htb-badge-cyan",
  QUIZ: "htb-badge-purple",
  LAB: "htb-badge-amber",
  PROJECT: "htb-badge-red",
};

export const LESSON_ICON: Record<LessonType, string> = {
  READING: "¶",
  VIDEO: "▶",
  QUIZ: "?",
  LAB: "⌨",
  PROJECT: "◆",
};

export function DifficultyBadge({ value }: { value: Difficulty }) {
  return <span className={`htb-badge ${DIFFICULTY_TONE[value]}`}>{value.toLowerCase()}</span>;
}

export function StatusBadge({ value }: { value: PathStatus }) {
  const tone = value === "PUBLISHED" ? "htb-badge-green" : value === "ARCHIVED" ? "htb-badge-red" : "htb-badge-amber";
  return <span className={`htb-badge ${tone}`}>{value.toLowerCase()}</span>;
}

export function LessonTypeBadge({ value }: { value: LessonType }) {
  return (
    <span className={`htb-badge ${LESSON_TONE[value]}`}>
      <span className="htb-mono">{LESSON_ICON[value]}</span> {value.toLowerCase()}
    </span>
  );
}

/** 0..1 progress as a thin bar with an optional label. */
export function ProgressBar({
  value,
  label = true,
  className = "",
}: {
  value: number;
  label?: boolean;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone = pct >= 100 ? "bg-htb-green" : pct > 0 ? "bg-htb-cyan" : "bg-htb-border-bright";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 rounded bg-htb-bg-elevated overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="htb-mono text-[0.65rem] text-htb-text-dim w-8 text-right">{pct}%</span>}
    </div>
  );
}

export function minutes(n: number): string {
  if (n <= 0) return "—";
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function PathCard({
  path,
  href,
}: {
  path: {
    slug: string;
    title: string;
    description?: string | null;
    difficulty: Difficulty;
    tags: string[];
    status?: PathStatus;
    estimatedMinutes: number;
    enrollment?: { status: string; progress: number } | null;
  };
  href: string;
}) {
  const e = path.enrollment && path.enrollment.status !== "DROPPED" ? path.enrollment : null;
  return (
    <Link href={href} className="htb-card htb-card-interactive p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="htb-heading text-lg text-htb-text">{path.title}</h3>
        <DifficultyBadge value={path.difficulty} />
      </div>
      {path.description && (
        <p className="htb-mono text-xs text-htb-text-muted line-clamp-2">{path.description}</p>
      )}
      {e && <ProgressBar value={e.progress} />}
      <div className="mt-auto flex items-center justify-between gap-2 htb-mono text-[0.65rem] text-htb-text-dim">
        <span>{minutes(path.estimatedMinutes)}</span>
        <span className="flex gap-1 flex-wrap justify-end">
          {path.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-htb-cyan">
              #{t}
            </span>
          ))}
        </span>
      </div>
      {path.status && path.status !== "PUBLISHED" && <StatusBadge value={path.status} />}
    </Link>
  );
}

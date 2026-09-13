import Link from "next/link";
import type { CourseStatus, Difficulty, LessonType } from "@/graphql/generated";

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

export function StatusBadge({ value }: { value: CourseStatus }) {
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

export function minutes(n: number): string {
  if (n <= 0) return "—";
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function CourseCard({
  course,
  href,
}: {
  course: {
    slug: string;
    title: string;
    description?: string | null;
    difficulty: Difficulty;
    tags: string[];
    status?: CourseStatus;
    estimatedMinutes: number;
  };
  href: string;
}) {
  return (
    <Link href={href} className="htb-card htb-card-interactive p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="htb-heading text-lg text-htb-text">{course.title}</h3>
        <DifficultyBadge value={course.difficulty} />
      </div>
      {course.description && (
        <p className="htb-mono text-xs text-htb-text-muted line-clamp-2">{course.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 htb-mono text-[0.65rem] text-htb-text-dim">
        <span>{minutes(course.estimatedMinutes)}</span>
        <span className="flex gap-1 flex-wrap justify-end">
          {course.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-htb-cyan">
              #{t}
            </span>
          ))}
        </span>
      </div>
      {course.status && course.status !== "PUBLISHED" && <StatusBadge value={course.status} />}
    </Link>
  );
}

# Level 1 — Domain Model (Learn)

All tables live in schema `learn`. `user_id` columns hold `identity.users.id` UUIDs **without** a foreign key (schema-per-service, AD-1). Display names are fetched from identity at read time.

## 1. Entity relationship

```mermaid
erDiagram
    roadmaps ||--o{ roadmap_items : orders
    courses  ||--o{ roadmap_items : "appears in"
    courses  ||--o{ modules : has
    modules  ||--o{ lessons : has
    lessons  ||--o| quizzes : "QUIZ lesson"
    lessons  ||--o| labs : "LAB lesson"
    lessons  ||--o| projects : "PROJECT lesson"
    quizzes  ||--o{ quiz_questions : has
    quiz_questions ||--o{ quiz_options : has
    quizzes  ||--o{ quiz_attempts : graded
    labs     ||--o{ lab_tasks : has
    labs     ||--o{ lab_sessions : "instances of"
    lab_sessions ||--o{ lab_task_completions : solves
    projects ||--o{ project_submissions : receives
    courses  ||--o{ enrollments : "enrolled by"
    lessons  ||--o{ lesson_progress : "completed by"
```

## 2. Content aggregates (authored by `ADMIN`)

### `roadmaps`
| Column | Type | Notes |
| :-- | :-- | :-- |
| id | UUID PK | |
| slug | TEXT UNIQUE | URL key, e.g. `web-exploitation` |
| title, description_md | TEXT | |
| difficulty | `BEGINNER \| INTERMEDIATE \| ADVANCED` | |
| published | BOOLEAN | learners see only `true` |
| created_by | UUID | author user id |
| created_at, updated_at | TIMESTAMP | |

### `roadmap_items`
`(roadmap_id, course_id)` PK · `position INT` (unique per roadmap) · `required BOOLEAN` (counts toward roadmap completion). Linear order; no DAG prerequisites in Plan 01.

### `courses` (extends the Plan 00 baseline)
Adds `slug UNIQUE`, `difficulty`, `tags TEXT[]`, `published`, `created_by`, `updated_at`, `estimated_minutes INT` (derived cache). Keeps `id`, `title`, `description`, `created_at`.

### `modules`
`id, course_id → courses (CASCADE), title, description_md, position` — `UNIQUE (course_id, position)`.

### `lessons` (restructured)
| Column | Notes |
| :-- | :-- |
| id | |
| module_id → modules (CASCADE) | **replaces** `course_id` from V1 |
| title | |
| type | `READING \| VIDEO \| QUIZ \| LAB \| PROJECT` (`EXERCISE` reserved, not used) |
| content_md | markdown body / notes; nullable for `QUIZ`/`LAB`/`PROJECT` |
| video_url | for `VIDEO` |
| position | `UNIQUE (module_id, position)` |
| estimated_minutes | |
| created_at, updated_at | |

### `quizzes` → `quiz_questions` → `quiz_options`
- `quizzes(id, lesson_id UNIQUE → lessons, pass_score INT /*0-100*/, shuffle BOOLEAN)`
- `quiz_questions(id, quiz_id, position, prompt_md, kind SINGLE|MULTI, points INT default 1)`
- `quiz_options(id, question_id, position, text_md, correct BOOLEAN)` — `correct` is **never** exposed in learner-facing GraphQL types.

### `labs` → `lab_tasks`
- `labs(id, lesson_id UNIQUE → lessons, title, brief_md, image_ref TEXT, exposed_port INT, ttl_minutes INT, cpu_millis INT, memory_mb INT, flag_mode STATIC|PER_SESSION)`
- `lab_tasks(id, lab_id, position, prompt_md, flag_hash TEXT /*SHA-256, STATIC mode*/, flag_env TEXT /*env var name, PER_SESSION mode*/, points INT, required BOOLEAN)`

### `projects` → `project_submissions`
- `projects(id, lesson_id UNIQUE → lessons, title, brief_md, rubric_md, deliverable REPO_URL|WRITEUP|BOTH)`
- see §3 for submissions.

## 3. Learner aggregates (written by `USER`)

| Table | Key | Columns | State machine |
| :-- | :-- | :-- | :-- |
| `enrollments` | `(user_id, course_id)` | `enrolled_at, completed_at` | created on `enroll`; `completed_at` set when every lesson in the course is complete |
| `lesson_progress` | `(user_id, lesson_id)` | `status STARTED\|COMPLETED, started_at, completed_at, meta JSONB` | `READING/VIDEO`: learner marks complete · `QUIZ`: passed attempt · `LAB`: all `required` tasks solved · `PROJECT`: submission `APPROVED` |
| `quiz_attempts` | id | `quiz_id, user_id, answers JSONB /*{questionId:[optionId]}*/, score INT, passed BOOLEAN, submitted_at` | append-only; best attempt counts |
| `lab_sessions` | id | `lab_id, user_id, runner_instance_id TEXT, status, endpoint TEXT /*host:port*/, flags JSONB /*taskId→hash, PER_SESSION*/, started_at, expires_at, stopped_at, fail_reason` | `STARTING → RUNNING → STOPPED \| EXPIRED \| FAILED` (terminal states) |
| `lab_task_completions` | `(user_id, task_id)` | `session_id, completed_at` | insert on correct flag; idempotent |
| `project_submissions` | id | `project_id, user_id, repo_url, writeup_md, status, reviewer_id, feedback_md, submitted_at, reviewed_at` | `SUBMITTED → IN_REVIEW → APPROVED \| CHANGES_REQUESTED`; `CHANGES_REQUESTED → SUBMITTED` on resubmit (new row, previous kept) |

## 4. Derived values (computed, not stored — except caches noted)

| Value | Rule |
| :-- | :-- |
| course progress % | `COMPLETED lesson_progress` in course / total lessons in course |
| course complete | progress = 100 % → set `enrollments.completed_at` (cache) |
| roadmap progress % | mean of course progress over `required` items |
| lab complete | every `required` task has a `lab_task_completions` row for the user |
| quiz best score | `MAX(score)` over attempts |
| `courses.estimated_minutes` | `SUM(lessons.estimated_minutes)` recomputed on lesson write (cache) |

## 5. Invariants

- A lesson of type `QUIZ`/`LAB`/`PROJECT` must have exactly one child aggregate; enforced in the service layer at publish time (a course cannot be published with an incomplete typed lesson).
- Unpublished content is invisible to `USER` in every query, including nested ones (a published roadmap referencing an unpublished course hides that item).
- At most `LAB_MAX_ACTIVE_SESSIONS_PER_USER` (default 1) sessions in `STARTING|RUNNING` per user.
- Flag comparison is constant-time on SHA-256 hashes; plaintext flags are never stored (STATIC) or stored only in the runner's process env for the session lifetime (PER_SESSION — Learn stores the hash).
- Deleting a course cascades content but **never** deletes learner rows; `lesson_progress`/`quiz_attempts` rows referencing deleted lessons are removed by the same cascade only for lessons, and enrollments keep `completed_at` history via `ON DELETE SET NULL`-free design: courses are soft-deleted (`published=false` + `archived_at`) in Plan 01; hard delete is an operator action.

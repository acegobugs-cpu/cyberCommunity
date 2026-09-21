# Level 3 — Data & Migrations (Learn)

Flyway, schema `learn`, files under `infra/migrations/learn/`. `V1` exists (Plan 00). One migration per roadmap phase so that each phase is deployable on its own. All statements assume `SET search_path TO learn;` at the top of each file.

## V2 — content model v2 (Phase L1)

```sql
-- courses: catalogue fields + publishing
ALTER TABLE courses
  ADD COLUMN slug TEXT,
  ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'BEGINNER'
      CHECK (difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN created_by UUID,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN estimated_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN archived_at TIMESTAMP;
UPDATE courses SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
  WHERE slug IS NULL;
ALTER TABLE courses ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT uq_courses_slug UNIQUE (slug);

-- modules
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description_md TEXT,
  position INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_modules_position UNIQUE (course_id, position)
);

-- lessons: move under modules, add type/content
ALTER TABLE lessons
  ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN type TEXT NOT NULL DEFAULT 'READING'
      CHECK (type IN ('READING','VIDEO','QUIZ','LAB','PROJECT','EXERCISE')),
  ADD COLUMN video_url TEXT,
  ADD COLUMN estimated_minutes INT,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE lessons RENAME COLUMN content TO content_md;
ALTER TABLE lessons RENAME COLUMN order_index TO position;

-- data move: one default module per course that has lessons
INSERT INTO modules (course_id, title, position)
  SELECT DISTINCT course_id, 'Module 1', 1 FROM lessons;
UPDATE lessons l SET module_id = m.id FROM modules m WHERE m.course_id = l.course_id;

ALTER TABLE lessons ALTER COLUMN module_id SET NOT NULL,
  DROP COLUMN course_id,
  ADD CONSTRAINT uq_lessons_position UNIQUE (module_id, position);
DROP INDEX IF EXISTS idx_lesson_course_id;
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_courses_published ON courses(published) WHERE archived_at IS NULL;
```

## V3 — enrollment & progress (Phase L2)

```sql
CREATE TABLE enrollments (
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  PRIMARY KEY (user_id, course_id)
);
CREATE TABLE lesson_progress (
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('STARTED','COMPLETED')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  meta JSONB,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
```

## V4 — roadmaps (Phase L3)

```sql
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description_md TEXT,
  difficulty TEXT NOT NULL DEFAULT 'BEGINNER' CHECK (difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP
);
CREATE TABLE roadmap_items (
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position INT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (roadmap_id, course_id),
  CONSTRAINT uq_roadmap_items_position UNIQUE (roadmap_id, position)
);
```

## V5 — quizzes (Phase L4)

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  pass_score INT NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 0 AND 100),
  shuffle BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt_md TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('SINGLE','MULTI')),
  points INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_quiz_questions_position UNIQUE (quiz_id, position)
);
CREATE TABLE quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  text_md TEXT NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_quiz_options_position UNIQUE (question_id, position)
);
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
```

## Projects (Phase L5) — no migration *(final decision 2026-09-21)*

Projects have **no tables**. A `PROJECT` lesson is an ordinary lesson ("build this on your own machine, in your own repo"); its specification is carried by **`lesson_docs`**, which was added to **V1** (the dev DB was reset) because a folder tree of material is useful on any lesson type, not only projects. Sharing/feedback on the built result belongs to the Community service.

```sql
-- in V1, right after lessons
CREATE TABLE lesson_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    path TEXT NOT NULL,                                    -- "setup/01-gateway.md"; folders implicit from segments
    kind TEXT NOT NULL DEFAULT 'DOC' CHECK (kind IN ('DOC', 'VIDEO')),
    title VARCHAR(255) NOT NULL,
    content_md TEXT,                                       -- DOC body / VIDEO notes
    video_url TEXT,
    position INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lesson_docs_path UNIQUE (lesson_id, path),
    CONSTRAINT uq_lesson_docs_position UNIQUE (lesson_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_lesson_doc_body CHECK (
        (kind = 'DOC'   AND content_md IS NOT NULL) OR
        (kind = 'VIDEO' AND video_url  IS NOT NULL)
    )
);
CREATE INDEX idx_lesson_docs_lesson ON lesson_docs(lesson_id, position);
```

Two earlier designs were dropped the same day: a reviewed `project_submissions` queue (grading a capstone by hand), and `projects` + `project_docs` + `project_workspaces` (deliverable gate, peer showcase, author notes). Both put learner-side state in Learn that either isn't a real check or duplicates Community.

## Exercises (Phase L7) — sketch, real version number assigned when built

The code-workspace case: the platform holds a scaffold, the learner edits an allowed subset of files in the browser, and the club's tests are run by the judge inside the lab-runner's isolation.

```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  language TEXT NOT NULL,                        -- java | python | go …
  template_ref TEXT NOT NULL,                    -- image or archive with the scaffold + tests, pre-warmed deps
  run_image TEXT NOT NULL,
  editable_files TEXT[] NOT NULL,                -- the only paths a learner may change
  cpu_millis INT NOT NULL DEFAULT 1000,
  memory_mb INT NOT NULL DEFAULT 1024,
  timeout_s INT NOT NULL DEFAULT 120
);
CREATE TABLE exercise_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt_md TEXT NOT NULL,
  test_selector TEXT NOT NULL,                   -- e.g. "UserRepoTest"; never exposed to learners
  points INT NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  requires_previous BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_exercise_tasks_position UNIQUE (exercise_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE exercise_workspaces (               -- one per learner per exercise, shared by all its tasks
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  files JSONB NOT NULL DEFAULT '{}',             -- path → content, editable subset only
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, exercise_id)
);
CREATE TABLE exercise_runs (                     -- append-only, like quiz_attempts
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES exercise_tasks(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS','FAIL','ERROR','TIMEOUT')),
  output TEXT NOT NULL,                          -- trimmed stdout/stderr
  duration_ms INT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exercise_runs_user_task ON exercise_runs(user_id, task_id, ran_at DESC);
```

Completion: every `required` task has a `PASS` run → `completed_lessons` → V2 trigger.

## V7 — labs (Phase L6)

```sql
CREATE TABLE labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  brief_md TEXT NOT NULL,
  image_ref TEXT NOT NULL,                       -- e.g. ghcr.io/cyberclub/labs/dvwa:1.0
  exposed_port INT NOT NULL,
  ttl_minutes INT NOT NULL DEFAULT 60,
  cpu_millis INT NOT NULL DEFAULT 500,
  memory_mb INT NOT NULL DEFAULT 512,
  flag_mode TEXT NOT NULL DEFAULT 'STATIC' CHECK (flag_mode IN ('STATIC','PER_SESSION'))
);
CREATE TABLE lab_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  position INT NOT NULL,
  prompt_md TEXT NOT NULL,
  flag_hash TEXT,                                -- sha256 hex, STATIC mode
  flag_env TEXT,                                 -- env var injected into the container, PER_SESSION mode
  points INT NOT NULL DEFAULT 10,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_lab_tasks_position UNIQUE (lab_id, position)
);
CREATE TABLE lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  runner_instance_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('STARTING','RUNNING','STOPPED','EXPIRED','FAILED')),
  endpoint TEXT,
  flags JSONB,                                   -- {taskId: sha256} for PER_SESSION
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  stopped_at TIMESTAMP,
  fail_reason TEXT
);
CREATE INDEX idx_lab_sessions_active ON lab_sessions(user_id) WHERE status IN ('STARTING','RUNNING');
CREATE INDEX idx_lab_sessions_status ON lab_sessions(status, expires_at);
CREATE TABLE lab_task_completions (
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES lab_tasks(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES lab_sessions(id) ON DELETE CASCADE,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);
```

## Conventions

- Enumerations are `TEXT + CHECK` rather than PostgreSQL `ENUM` types — cheaper to extend in later migrations.
- Every learner table is keyed by `user_id` first so per-user reads are index-friendly.
- The runner keeps **no** database; `lab_sessions` is the single source of truth for who has what running.
- Tests: `TestFlywayConfig` (`filesystem:../infra/migrations/learn`) applies `V1..Vn`, so every migration is exercised by the integration suite from L0 on.

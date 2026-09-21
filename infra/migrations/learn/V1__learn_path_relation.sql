CREATE SCHEMA IF NOT EXISTS learn;
SET search_path TO learn;

-- Enumerations are TEXT + CHECK (not PostgreSQL ENUM types): later migrations
-- can extend them with a plain ALTER TABLE ... DROP/ADD CONSTRAINT inside a
-- Flyway transaction, and JDBC needs no casts.

-- 1. paths
CREATE TABLE paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    difficulty TEXT NOT NULL DEFAULT 'BEGINNER'
        CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by UUID,
    estimated_minutes INT NOT NULL DEFAULT 0,          -- cache: SUM(lessons.estimated_minutes)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_paths_status ON paths(status) WHERE archived_at IS NULL;
CREATE INDEX idx_paths_tags ON paths USING GIN(tags);

-- 2. Modules — reusable content units; ordering lives on path_modules.
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description_md TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Path ↔ Module link (a module may appear in many paths, once per path)
CREATE TABLE path_modules (
    path_id UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    position INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (path_id, module_id),
    CONSTRAINT uq_path_modules_position UNIQUE (path_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_path_modules_module_id ON path_modules(module_id);

-- 4. Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type TEXT NOT NULL DEFAULT 'READING'
        CHECK (type IN ('READING', 'VIDEO', 'QUIZ', 'LAB', 'PROJECT', 'EXERCISE')),
    content_md TEXT,
    video_url TEXT,
    estimated_minutes INT NOT NULL DEFAULT 0,
    position INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lessons_position UNIQUE (module_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_lessons_module_id ON lessons(module_id);

-- 5. Lesson documents — an optional folder tree of extra material on ANY lesson.
--    `content_md` stays the lesson's main body; docs are the "repository view"
--    below it: a project specification split into folders/files, a set of
--    tutorial videos, appendices to a long reading… `path` is slash-separated
--    ("setup/01-gateway.md", "videos/02-routing"); folders are implicit from the
--    segments. A DOC row is markdown, a VIDEO row is a URL plus optional notes.
--    PROJECT lessons ("build this on your own machine, in your own repo") are
--    ordinary lessons that usually carry such a tree; they have no table of
--    their own — sharing the result is the Community service's job.
CREATE TABLE lesson_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'DOC' CHECK (kind IN ('DOC', 'VIDEO')),
    title VARCHAR(255) NOT NULL,
    content_md TEXT,
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

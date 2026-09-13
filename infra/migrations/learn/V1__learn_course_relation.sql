CREATE SCHEMA IF NOT EXISTS learn;
SET search_path TO learn;

-- Enumerations are TEXT + CHECK (not PostgreSQL ENUM types): later migrations
-- can extend them with a plain ALTER TABLE ... DROP/ADD CONSTRAINT inside a
-- Flyway transaction, and JDBC needs no casts.

-- 1. Courses
CREATE TABLE courses (
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

CREATE INDEX idx_courses_status ON courses(status) WHERE archived_at IS NULL;
CREATE INDEX idx_courses_tags ON courses USING GIN(tags);

-- 2. Modules
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description_md TEXT,
    position INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- DEFERRABLE so a reorder can swap positions inside one transaction
    CONSTRAINT uq_modules_position UNIQUE (course_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_modules_course_id ON modules(course_id);

-- 3. Lessons
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

SET search_path TO learn;

-- =============================================================================
-- Plan 01 · L4 — quizzes (multiple choice)
--
--   lessons(type = 'QUIZ') ||--o| quizzes ||--o{ quiz_questions ||--o{ quiz_options
--   quizzes ||--o{ quiz_attempts   (append-only; best attempt counts)
--
-- Grading lives in QuizService: per-question points, SINGLE = the one correct
-- option, MULTI = the exact set of correct options; score = 0..100 percent of
-- points earned; passed = score >= pass_score. A passed attempt inserts the
-- (user, lesson) row into completed_lessons, so the V2 trigger rolls module
-- and path progress forward exactly as a manual "mark complete" does.
--
-- quiz_options.correct is never exposed to learners (the resolver nulls it).
-- =============================================================================

CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    pass_score INT NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 0 AND 100),
    shuffle BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    position INT NOT NULL,
    prompt_md TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'SINGLE' CHECK (kind IN ('SINGLE', 'MULTI')),
    points INT NOT NULL DEFAULT 1 CHECK (points >= 1),
    CONSTRAINT uq_quiz_questions_position UNIQUE (quiz_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    position INT NOT NULL,
    text_md TEXT NOT NULL,
    correct BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_quiz_options_position UNIQUE (question_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id, position);
CREATE INDEX idx_quiz_options_question ON quiz_options(question_id, position);

-- Append-only. answers = {"<questionId>": ["<optionId>", ...]}.
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    answers JSONB NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id, score DESC);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

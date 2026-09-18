SET search_path TO learn;

-- =============================================================================
-- Plan 01 · L2 — enrollment & progress
--
-- Progress is derived and cached in PostgreSQL so every read (catalogue,
-- syllabus, dashboard) is a single join and the numbers can never drift from
-- the completed-lesson facts:
--
--   completed_lessons  (fact)      user × lesson         → lesson is done or not
--   module_progress    (derived)   user × module         STARTED → IN_PROGRESS → COMPLETED | DROPPED
--   enrollments        (derived)   user × path           ENROLLED → COMPLETED | DROPPED
--
-- user_id refers to identity.users (another schema) — no FK by design (AD-1).
-- =============================================================================

CREATE TABLE enrollments (
    user_id       UUID NOT NULL,
    path_id       UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'ENROLLED'
                  CHECK (status IN ('ENROLLED', 'COMPLETED', 'DROPPED')),
    progress      NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    dropped_at    TIMESTAMPTZ,
    PRIMARY KEY (user_id, path_id)
);
CREATE INDEX idx_enrollments_path ON enrollments(path_id);

CREATE TABLE module_progress (
    user_id       UUID NOT NULL,
    module_id     UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'STARTED'
                  CHECK (status IN ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED')),
    progress      NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    PRIMARY KEY (user_id, module_id)
);
CREATE INDEX idx_module_progress_module ON module_progress(module_id);

CREATE TABLE completed_lessons (
    user_id       UUID NOT NULL,
    lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX idx_completed_lessons_lesson ON completed_lessons(lesson_id);

-- -----------------------------------------------------------------------------
-- Recompute one user's progress for one module and for every path that module
-- belongs to. Called from the completed_lessons trigger and callable directly
-- (e.g. after an author adds/removes lessons).
--   module progress = completed lessons / lessons in module
--   path   progress = mean of module progress over the path's modules
--                     (0 for modules the user has not touched)
--   DROPPED rows are left alone; re-enrolling / restarting revives them.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION learn.recompute_progress(p_user UUID, p_module UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_path      UUID;
    v_total     INT;
    v_done      INT;
    v_progress  NUMERIC(5,4);
BEGIN
    SELECT path_id INTO v_path FROM learn.modules WHERE id = p_module;
    IF v_path IS NULL THEN
        RETURN;
    END IF;

    -- module
    SELECT COUNT(*) INTO v_total FROM learn.lessons WHERE module_id = p_module;
    SELECT COUNT(*) INTO v_done
    FROM learn.completed_lessons cl
    JOIN learn.lessons l ON l.id = cl.lesson_id
    WHERE cl.user_id = p_user AND l.module_id = p_module;

    v_progress := CASE WHEN v_total > 0 THEN ROUND(v_done::NUMERIC / v_total, 4) ELSE 0 END;

    INSERT INTO learn.module_progress (user_id, module_id, status, progress, completed_at)
    VALUES (
        p_user, p_module,
        CASE WHEN v_progress >= 1 THEN 'COMPLETED' WHEN v_done > 0 THEN 'IN_PROGRESS' ELSE 'STARTED' END,
        v_progress,
        CASE WHEN v_progress >= 1 THEN NOW() END
    )
    ON CONFLICT (user_id, module_id) DO UPDATE SET
        progress     = EXCLUDED.progress,
        status       = CASE
                         WHEN learn.module_progress.status = 'DROPPED' THEN 'DROPPED'
                         ELSE EXCLUDED.status
                       END,
        completed_at = CASE
                         WHEN EXCLUDED.progress >= 1 THEN COALESCE(learn.module_progress.completed_at, NOW())
                         ELSE NULL
                       END;

    -- path (only if enrolled)
    SELECT COUNT(*) INTO v_total FROM learn.modules WHERE path_id = v_path;

    SELECT COALESCE(ROUND(SUM(COALESCE(mp.progress, 0)) / NULLIF(v_total, 0), 4), 0) INTO v_progress
    FROM learn.modules m
    LEFT JOIN learn.module_progress mp ON mp.module_id = m.id AND mp.user_id = p_user
    WHERE m.path_id = v_path;

    UPDATE learn.enrollments
    SET progress     = v_progress,
        status       = CASE
                         WHEN status = 'DROPPED' THEN 'DROPPED'
                         WHEN v_progress >= 1 THEN 'COMPLETED'
                         ELSE 'ENROLLED'
                       END,
        completed_at = CASE WHEN v_progress >= 1 THEN COALESCE(completed_at, NOW()) ELSE NULL END
    WHERE user_id = p_user AND path_id = v_path;
END;
$$;

CREATE OR REPLACE FUNCTION learn.trg_completed_lessons()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_row  learn.completed_lessons;
    v_mod  UUID;
BEGIN
    v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    SELECT module_id INTO v_mod FROM learn.lessons WHERE id = v_row.lesson_id;
    IF v_mod IS NOT NULL THEN
        PERFORM learn.recompute_progress(v_row.user_id, v_mod);
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER completed_lessons_recompute
AFTER INSERT OR DELETE ON learn.completed_lessons
FOR EACH ROW EXECUTE FUNCTION learn.trg_completed_lessons();

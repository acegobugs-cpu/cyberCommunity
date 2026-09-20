SET search_path TO learn;

-- =============================================================================
-- Plan 01 · L3 — roadmaps
--
-- A roadmap is an ordered set of steps; each step (= position) holds one or
-- more items, each pointing at a path OR a module. Roadmaps are NOT enrolled:
-- a learner's roadmap progress is derived on read from the enrollments and
-- module_progress rows L2 already maintains, so the landing page can surface
-- "roadmaps you are already on" from whatever they have learned so far.
--
--   item progress      path item   → enrollments.progress   (0 when not enrolled)
--                      module item → module_progress.progress (0 when not started)
--   step progress      ALL    → mean of its required items
--                      CHOICE → max of its required items (pick any one)
--   roadmap progress   mean over steps that have ≥1 required item
--                      (non-required items never move the percentage)
-- =============================================================================

CREATE TABLE roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description_md TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_roadmaps_status ON roadmaps(status) WHERE archived_at IS NULL;

CREATE TABLE roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    path_id UUID REFERENCES paths(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,

    position INT NOT NULL,                     -- step number (1, 2, 3…); several items may share a step
    group_type TEXT NOT NULL DEFAULT 'ALL'
        CHECK (group_type IN ('ALL', 'CHOICE')), -- CHOICE: any one item of the step satisfies it

    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_roadmap_item_target CHECK (
        (path_id IS NOT NULL AND module_id IS NULL) OR
        (path_id IS NULL AND module_id IS NOT NULL)
    )
);

CREATE INDEX idx_roadmap_items_roadmap_pos ON roadmap_items(roadmap_id, position);
-- a path / module appears at most once per roadmap
CREATE UNIQUE INDEX uq_roadmap_items_path   ON roadmap_items(roadmap_id, path_id)   WHERE path_id   IS NOT NULL;
CREATE UNIQUE INDEX uq_roadmap_items_module ON roadmap_items(roadmap_id, module_id) WHERE module_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Roadmap progress for one user (rule in the header). A pure function of L2
-- state: nothing is cached or triggered for roadmaps. DROPPED enrollments /
-- modules still contribute their progress — the lessons were done.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION learn.roadmap_progress(p_user UUID, p_roadmap UUID)
RETURNS NUMERIC(5,4)
LANGUAGE sql STABLE AS $$
    WITH item AS (
        SELECT ri.position, ri.group_type,
               COALESCE(e.progress, mp.progress, 0) AS progress
        FROM learn.roadmap_items ri
        LEFT JOIN learn.enrollments     e  ON e.path_id    = ri.path_id   AND e.user_id  = p_user
        LEFT JOIN learn.module_progress mp ON mp.module_id = ri.module_id AND mp.user_id = p_user
        WHERE ri.roadmap_id = p_roadmap AND ri.is_required
    ),
    step AS (
        SELECT position,
               CASE WHEN bool_or(group_type = 'CHOICE') THEN MAX(progress) ELSE AVG(progress) END AS progress
        FROM item
        GROUP BY position
    )
    SELECT COALESCE(ROUND(AVG(progress), 4), 0)::NUMERIC(5,4) FROM step;
$$;
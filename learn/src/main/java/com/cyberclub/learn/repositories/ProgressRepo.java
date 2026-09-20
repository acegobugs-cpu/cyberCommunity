package com.cyberclub.learn.repositories;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Enrollment;
import com.cyberclub.learn.dtos.domain.EnrollmentStatus;
import com.cyberclub.learn.dtos.domain.ModuleProgress;
import com.cyberclub.learn.dtos.domain.ModuleProgressStatus;

/**
 * Learner progress. Writes are facts (enroll / drop / start / complete lesson);
 * the derived numbers in module_progress and enrollments are maintained by the
 * database (see V2 migration), so this class only reads them back.
 */
@Repository
public class ProgressRepo {

    private static final String ENROLLMENT_COLS = "user_id, path_id, status, progress, enrolled_at, completed_at, dropped_at";
    private static final String MODULE_COLS = "user_id, module_id, status, progress, started_at, completed_at";

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    static final RowMapper<Enrollment> ENROLLMENT = (rs, i) -> new Enrollment(
        rs.getObject("user_id", UUID.class),
        rs.getObject("path_id", UUID.class),
        EnrollmentStatus.valueOf(rs.getString("status")),
        rs.getBigDecimal("progress"),
        instant(rs, "enrolled_at"),
        instant(rs, "completed_at"),
        instant(rs, "dropped_at")
    );

    static final RowMapper<ModuleProgress> MODULE = (rs, i) -> new ModuleProgress(
        rs.getObject("user_id", UUID.class),
        rs.getObject("module_id", UUID.class),
        ModuleProgressStatus.valueOf(rs.getString("status")),
        rs.getBigDecimal("progress"),
        instant(rs, "started_at"),
        instant(rs, "completed_at")
    );

    private final JdbcTemplate jdbc;

    public ProgressRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- enrollments

    /**
     * Enroll, or revive a DROPPED enrollment. Idempotent for an active one.
     * Progress is recomputed straight away: shared modules may already be done.
     */
    public Enrollment enroll(UUID userId, UUID pathId) {
        jdbc.update("""
            INSERT INTO enrollments (user_id, path_id)
            VALUES (?, ?)
            ON CONFLICT (user_id, path_id) DO UPDATE SET
                status = CASE WHEN enrollments.status = 'DROPPED' THEN 'ENROLLED' ELSE enrollments.status END,
                dropped_at = NULL
            """, userId, pathId);
        jdbc.queryForObject("SELECT learn.recompute_path_progress(?, ?)", Object.class, userId, pathId);
        return findEnrollment(userId, pathId).orElseThrow();
    }

    public Optional<Enrollment> drop(UUID userId, UUID pathId) {
        return jdbc.query("""
            UPDATE enrollments SET status = 'DROPPED', dropped_at = now()
            WHERE user_id = ? AND path_id = ? AND status <> 'DROPPED'
            RETURNING %s
            """.formatted(ENROLLMENT_COLS), ENROLLMENT, userId, pathId).stream().findFirst();
    }

    public Optional<Enrollment> findEnrollment(UUID userId, UUID pathId) {
        return jdbc.query("SELECT " + ENROLLMENT_COLS + " FROM enrollments WHERE user_id = ? AND path_id = ?",
            ENROLLMENT, userId, pathId).stream().findFirst();
    }

    /** pathId → enrollment for a batch of paths (for {@code Path.enrollment}). */
    public Map<UUID, Enrollment> enrollmentsFor(UUID userId, List<UUID> pathIds) {
        if (pathIds.isEmpty()) return Map.of();
        return jdbc.query("SELECT " + ENROLLMENT_COLS + " FROM enrollments WHERE user_id = ? AND path_id = ANY(?)",
                ENROLLMENT, userId, (Object) pathIds.toArray(new UUID[0]))
            .stream().collect(Collectors.toMap(Enrollment::pathId, e -> e));
    }

    /** Active (not dropped) enrollments, most recently enrolled first. */
    public List<Enrollment> activeEnrollments(UUID userId) {
        return jdbc.query("""
            SELECT %s FROM enrollments
            WHERE user_id = ? AND status <> 'DROPPED'
            ORDER BY (status = 'ENROLLED') DESC, enrolled_at DESC
            """.formatted(ENROLLMENT_COLS), ENROLLMENT, userId);
    }

    // ---------------------------------------------------------------- modules

    /** Explicit "start module"; revives DROPPED, no-op otherwise. */
    public ModuleProgress startModule(UUID userId, UUID moduleId) {
        return jdbc.queryForObject("""
            INSERT INTO module_progress (user_id, module_id)
            VALUES (?, ?)
            ON CONFLICT (user_id, module_id) DO UPDATE SET
                status = CASE WHEN module_progress.status = 'DROPPED'
                              THEN CASE WHEN module_progress.progress > 0 THEN 'IN_PROGRESS' ELSE 'STARTED' END
                              ELSE module_progress.status END
            RETURNING %s
            """.formatted(MODULE_COLS), MODULE, userId, moduleId);
    }

    public Optional<ModuleProgress> dropModule(UUID userId, UUID moduleId) {
        return jdbc.query("""
            UPDATE module_progress SET status = 'DROPPED'
            WHERE user_id = ? AND module_id = ? AND status <> 'DROPPED'
            RETURNING %s
            """.formatted(MODULE_COLS), MODULE, userId, moduleId).stream().findFirst();
    }

    public Map<UUID, ModuleProgress> moduleProgressFor(UUID userId, List<UUID> moduleIds) {
        if (moduleIds.isEmpty()) return Map.of();
        return jdbc.query("SELECT " + MODULE_COLS + " FROM module_progress WHERE user_id = ? AND module_id = ANY(?)",
                MODULE, userId, (Object) moduleIds.toArray(new UUID[0]))
            .stream().collect(Collectors.toMap(ModuleProgress::moduleId, m -> m));
    }

    // ---------------------------------------------------------------- lessons

    /** Idempotent. The DB trigger recomputes module + path progress. */
    public boolean completeLesson(UUID userId, UUID lessonId) {
        return jdbc.update("INSERT INTO completed_lessons (user_id, lesson_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            userId, lessonId) > 0;
    }

    public Set<UUID> completedLessonIds(UUID userId, List<UUID> lessonIds) {
        if (lessonIds.isEmpty()) return Set.of();
        return Set.copyOf(jdbc.queryForList(
            "SELECT lesson_id FROM completed_lessons WHERE user_id = ? AND lesson_id = ANY(?)",
            UUID.class, userId, (Object) lessonIds.toArray(new UUID[0])));
    }

    /** First lesson (path's module order, then lesson order) of a path the user has not completed. */
    public Optional<UUID> nextLessonId(UUID userId, UUID pathId) {
        return jdbc.queryForList("""
            SELECT l.id
            FROM path_modules pm
            JOIN lessons l ON l.module_id = pm.module_id
            WHERE pm.path_id = ?
              AND NOT EXISTS (SELECT 1 FROM completed_lessons c WHERE c.user_id = ? AND c.lesson_id = l.id)
            ORDER BY pm.position, l.position
            LIMIT 1
            """, UUID.class, pathId, userId).stream().findFirst();
    }

    /** Re-derive after an author changes a module's lesson set. */
    public void recompute(UUID userId, UUID moduleId) {
        jdbc.queryForObject("SELECT learn.recompute_progress(?, ?)", Object.class, userId, moduleId);
    }

    /** Recompute for everyone who has touched the module (author edits). */
    public void recomputeAll(UUID moduleId) {
        jdbc.query("""
            SELECT learn.recompute_progress(mp.user_id, mp.module_id)
            FROM module_progress mp WHERE mp.module_id = ?
            """, rs -> {}, moduleId);
    }

    /** A path's module set changed: re-derive every enrollment in it. */
    public void recomputeAllForPath(UUID pathId) {
        jdbc.query("""
            SELECT learn.recompute_path_progress(e.user_id, e.path_id)
            FROM enrollments e WHERE e.path_id = ?
            """, rs -> {}, pathId);
    }
}

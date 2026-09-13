package com.cyberclub.learn.repositories;

import java.sql.Array;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.CourseStatus;
import com.cyberclub.learn.dtos.domain.Difficulty;

@Repository
public class CourseRepo {

    private static final String COLUMNS =
        "id, slug, title, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at";

    private final JdbcTemplate jdbc;

    public CourseRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static final RowMapper<Course> MAPPER = (rs, i) -> {
        Array tags = rs.getArray("tags");
        String createdBy = rs.getString("created_by");
        Timestamp archived = rs.getTimestamp("archived_at");
        return new Course(
            UUID.fromString(rs.getString("id")),
            rs.getString("slug"),
            rs.getString("title"),
            rs.getString("description"),
            Difficulty.valueOf(rs.getString("difficulty")),
            tags == null ? List.of() : Arrays.asList((String[]) tags.getArray()),
            CourseStatus.valueOf(rs.getString("status")),
            rs.getInt("estimated_minutes"),
            createdBy == null ? null : UUID.fromString(createdBy),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant(),
            archived == null ? null : archived.toInstant()
        );
    };

    /**
     * Catalogue query. {@code includeUnpublished=false} restricts to PUBLISHED;
     * archived courses are never listed.
     */
    public List<Course> find(Difficulty difficulty, String tag, String search, boolean includeUnpublished) {
        StringBuilder sql = new StringBuilder("SELECT " + COLUMNS + " FROM courses WHERE archived_at IS NULL");
        List<Object> args = new ArrayList<>();
        if (!includeUnpublished) {
            sql.append(" AND status = 'PUBLISHED'");
        }
        if (difficulty != null) {
            sql.append(" AND difficulty = ?");
            args.add(difficulty.name());
        }
        if (tag != null && !tag.isBlank()) {
            sql.append(" AND ? = ANY(tags)");
            args.add(tag);
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (title ILIKE ? OR description ILIKE ?)");
            String like = "%" + search.trim() + "%";
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY created_at DESC");
        return jdbc.query(sql.toString(), MAPPER, args.toArray());
    }

    public Optional<Course> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM courses WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public Optional<Course> findBySlug(String slug) {
        return jdbc.query("SELECT " + COLUMNS + " FROM courses WHERE slug = ?", MAPPER, slug).stream().findFirst();
    }

    public boolean slugTaken(String slug, UUID excludeId) {
        Integer n = excludeId == null
            ? jdbc.queryForObject("SELECT COUNT(*) FROM courses WHERE slug = ?", Integer.class, slug)
            : jdbc.queryForObject("SELECT COUNT(*) FROM courses WHERE slug = ? AND id <> ?", Integer.class, slug, excludeId);
        return n != null && n > 0;
    }

    public Course insert(String slug, String title, String description, Difficulty difficulty, List<String> tags, UUID createdBy) {
        return jdbc.queryForObject("""
            INSERT INTO courses (slug, title, description, difficulty, tags, status, created_by)
            VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
            RETURNING %s
            """.formatted(COLUMNS),
            MAPPER, slug, title, description, difficulty.name(), tags.toArray(new String[0]), createdBy);
    }

    public Course update(UUID id, String slug, String title, String description, Difficulty difficulty, List<String> tags) {
        return jdbc.queryForObject("""
            UPDATE courses
            SET slug = ?, title = ?, description = ?, difficulty = ?, tags = ?, updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS),
            MAPPER, slug, title, description, difficulty.name(), tags.toArray(new String[0]), id);
    }

    public Course setStatus(UUID id, CourseStatus status) {
        return jdbc.queryForObject("""
            UPDATE courses
            SET status = ?,
                archived_at = CASE WHEN ? = 'ARCHIVED' THEN now() ELSE NULL END,
                updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS),
            MAPPER, status.name(), status.name(), id);
    }

    /** Recomputes the estimated_minutes cache from the course's lessons. */
    public void refreshEstimatedMinutes(UUID courseId) {
        jdbc.update("""
            UPDATE courses c
            SET estimated_minutes = (
                SELECT COALESCE(SUM(l.estimated_minutes), 0)
                FROM modules m JOIN lessons l ON l.module_id = m.id
                WHERE m.course_id = c.id
            ), updated_at = now()
            WHERE c.id = ?
            """, courseId);
    }
}

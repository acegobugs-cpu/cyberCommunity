package com.cyberclub.learn.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;

@Repository
public class LessonRepo {

    private static final String COLUMNS =
        "id, module_id, title, type, content_md, video_url, position, estimated_minutes, created_at, updated_at";

    private final JdbcTemplate jdbc;

    public LessonRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static final RowMapper<Lesson> MAPPER = (rs, i) -> new Lesson(
        UUID.fromString(rs.getString("id")),
        UUID.fromString(rs.getString("module_id")),
        rs.getString("title"),
        LessonType.valueOf(rs.getString("type")),
        rs.getString("content_md"),
        rs.getString("video_url"),
        rs.getInt("position"),
        rs.getInt("estimated_minutes"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant()
    );

    public Optional<Lesson> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM lessons WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    /** Status of the course that owns the lesson — used for learner visibility. */
    public Optional<String> courseStatusOf(UUID lessonId) {
        return jdbc.query("""
            SELECT c.status FROM lessons l
            JOIN modules m ON m.id = l.module_id
            JOIN courses c ON c.id = m.course_id
            WHERE l.id = ?
            """, (rs, i) -> rs.getString("status"), lessonId).stream().findFirst();
    }

    /** Batch load for {@code Module.lessons}. */
    public List<Lesson> findByModuleIds(List<UUID> moduleIds) {
        if (moduleIds.isEmpty()) return List.of();
        return jdbc.query("SELECT " + COLUMNS + " FROM lessons WHERE module_id = ANY(?) ORDER BY module_id, position",
            MAPPER, (Object) moduleIds.toArray(new UUID[0]));
    }

    public List<UUID> idsForModule(UUID moduleId) {
        return jdbc.queryForList("SELECT id FROM lessons WHERE module_id = ?", UUID.class, moduleId);
    }

    public int nextPosition(UUID moduleId) {
        Integer max = jdbc.queryForObject("SELECT COALESCE(MAX(position), 0) FROM lessons WHERE module_id = ?", Integer.class, moduleId);
        return (max == null ? 0 : max) + 1;
    }

    public Lesson insert(UUID moduleId, String title, LessonType type, String contentMd, String videoUrl, int estimatedMinutes, int position) {
        return jdbc.queryForObject("""
            INSERT INTO lessons (module_id, title, type, content_md, video_url, estimated_minutes, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, moduleId, title, type.name(), contentMd, videoUrl, estimatedMinutes, position);
    }

    public Lesson update(UUID id, String title, LessonType type, String contentMd, String videoUrl, int estimatedMinutes, Integer position) {
        return jdbc.queryForObject("""
            UPDATE lessons
            SET title = ?, type = ?, content_md = ?, video_url = ?, estimated_minutes = ?,
                position = COALESCE(?, position), updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, title, type.name(), contentMd, videoUrl, estimatedMinutes, position, id);
    }

    public void reorder(List<UUID> orderedIds) {
        jdbc.batchUpdate("UPDATE lessons SET position = ?, updated_at = now() WHERE id = ?",
            orderedIds, orderedIds.size(), (ps, id) -> {
                ps.setInt(1, orderedIds.indexOf(id) + 1);
                ps.setObject(2, id);
            });
    }

    public boolean delete(UUID id) {
        return jdbc.update("DELETE FROM lessons WHERE id = ?", id) > 0;
    }
}

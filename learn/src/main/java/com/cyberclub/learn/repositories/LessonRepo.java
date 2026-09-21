package com.cyberclub.learn.repositories;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonDoc;
import com.cyberclub.learn.dtos.domain.LessonDocKind;
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

    /** Status of the path that owns the lesson — used for learner visibility. */
    /** A lesson is visible to learners when any path that includes its module is PUBLISHED. */
    public boolean inPublishedPath(UUID lessonId) {
        Integer n = jdbc.queryForObject("""
            SELECT COUNT(*) FROM lessons l
            JOIN path_modules pm ON pm.module_id = l.module_id
            JOIN paths c ON c.id = pm.path_id
            WHERE l.id = ? AND c.status = 'PUBLISHED'
            """, Integer.class, lessonId);
        return n != null && n > 0;
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

    // ---------------------------------------------------------------- lesson_docs (folder tree)

    private static final String DOC_COLUMNS = "id, lesson_id, path, kind, title, content_md, video_url, position, updated_at";

    static final RowMapper<LessonDoc> DOC_MAPPER = (rs, i) -> new LessonDoc(
        rs.getObject("id", UUID.class),
        rs.getObject("lesson_id", UUID.class),
        rs.getString("path"),
        LessonDocKind.valueOf(rs.getString("kind")),
        rs.getString("title"),
        rs.getString("content_md"),
        rs.getString("video_url"),
        rs.getInt("position"),
        rs.getTimestamp("updated_at").toInstant()
    );

    /** lessonId → docs in position order (every requested id present). */
    public Map<UUID, List<LessonDoc>> docsFor(List<UUID> lessonIds) {
        Map<UUID, List<LessonDoc>> out = new LinkedHashMap<>();
        lessonIds.forEach(id -> out.put(id, new ArrayList<>()));
        if (lessonIds.isEmpty()) return out;
        jdbc.query("SELECT " + DOC_COLUMNS + " FROM lesson_docs WHERE lesson_id = ANY(?) ORDER BY lesson_id, position",
            rs -> { LessonDoc d = DOC_MAPPER.mapRow(rs, 0); out.get(d.lessonId()).add(d); },
            (Object) lessonIds.toArray(new UUID[0]));
        return out;
    }

    /** Replace the whole tree; list order becomes position. */
    public void replaceDocs(UUID lessonId, List<DocRow> rows) {
        jdbc.update("DELETE FROM lesson_docs WHERE lesson_id = ?", lessonId);
        if (rows.isEmpty()) return;
        jdbc.batchUpdate("""
            INSERT INTO lesson_docs (lesson_id, path, kind, title, content_md, video_url, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, rows, rows.size(), (ps, r) -> {
                ps.setObject(1, lessonId);
                ps.setString(2, r.path());
                ps.setString(3, r.kind().name());
                ps.setString(4, r.title());
                ps.setString(5, r.contentMd());
                ps.setString(6, r.videoUrl());
                ps.setInt(7, rows.indexOf(r) + 1);
            });
    }

    public record DocRow(String path, LessonDocKind kind, String title, String contentMd, String videoUrl) {}
}

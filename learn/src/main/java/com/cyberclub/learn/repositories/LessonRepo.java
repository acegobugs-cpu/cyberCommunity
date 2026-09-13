package com.cyberclub.learn.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;
import com.cyberclub.learn.dtos.domain.ReorderInput;

@Repository
public class LessonRepo{

    private final JdbcTemplate jdbcTemplate;

    public LessonRepo(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Lesson> lessonMapper = (rs, rowNum) ->
            new Lesson(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("module_id")),
                rs.getString("title"),
                LessonType.valueOf(rs.getString("lesson_type")),
                rs.getString("content_md"),
                rs.getString("video_url"),
                rs.getInt("position"),
                rs.getInt("estimated_minutes"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
            );

    public List<Lesson> findAll(){
        var sql = """
                SELECT id, module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at, updated_at
                FROM lessons
                ORDER BY position ASC
                """;
        return jdbcTemplate.query(sql, lessonMapper);
    }

    public Lesson findById(UUID id){
        var sql = """
                SELECT id, module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at, updated_at
                FROM lessons
                WHERE id=?
                """;

        return jdbcTemplate.queryForObject(sql, lessonMapper, id);
    }

    public Lesson findByModuleId(UUID id){
        var sql = """
                SELECT id, module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at, updated_at
                FROM lessons
                WHERE module_id=?
                ORDER BY position ASC
                """;
        
        return jdbcTemplate
                .queryForObject(sql, lessonMapper, id);
    }

    public List<Lesson> findByModuleIds(List<UUID> moduleIds){
        if(moduleIds.isEmpty())return List.of();

        String inClause = String.join(",", moduleIds.stream().map(id -> "'" + id + "'").toList());
        var sql = String.format("""
                SELECT id, module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at, updated_at
                FROM lessons
                WHERE module_id IN (%s)
                ORDER BY position ASC
                """,inClause);

        return jdbcTemplate.query(sql, lessonMapper);
    }

    public Lesson save(UUID moduleId, String title, LessonType lessonType, String contentMd, String videoUrl, int position, int estimatedMinutes){
        var sql = """
                INSERT INTO lessons (module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at)
                VALUES (?,?,?,?,?,?,?, now())
                RETURNING id, module_id, title, lesson_type, content_md, video_url, position, estimated_minutes, created_at, updated_at
                """;

        return jdbcTemplate
                .queryForObject(sql, lessonMapper, moduleId, title, lessonType.name(), contentMd, videoUrl, position, estimatedMinutes);
    }

    public void updatePosition(List<ReorderInput> items){
        String sql = """
                UPDATE lessons
                SET position = ?, updated_at = now()
                WHERE id = ?
                """;
        jdbcTemplate.batchUpdate(sql, items, items.size(), (ps, item)->{
            ps.setInt(1, item.position());
            ps.setObject(2, item.id());
        });
    }
}
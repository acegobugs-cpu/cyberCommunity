package com.cyberclub.learn.repositories;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.CourseStatus;
import com.cyberclub.learn.dtos.domain.Difficulty;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CourseRepo {

    private final JdbcTemplate jdbcTemplate;

    public CourseRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Course> courseMapper = (rs, rowNum) ->
            new Course(
                UUID.fromString(rs.getString("id")),
                rs.getString("title"),
                rs.getString("slug"),
                rs.getString("description"),
                rs.getObject("tags"),
                Difficulty.valueOf(rs.getString("difficulty")),
                CourseStatus.valueOf(rs.getString("status")),
                rs.getInt("estimated_minutes"),
                UUID.fromString(rs.getString("created_by")),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null,
                rs.getTimestamp("archived_at") != null ? rs.getTimestamp("archived_at").toInstant() : null
            );

    // Filtered for standard users (Learners)
    public List<Course> findPublishedCourses() {
        var sql = """
                SELECT id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                FROM courses
                WHERE status = 'PUBLISHED'
                ORDER BY created_at DESC
                """;
        return jdbcTemplate.query(sql, courseMapper);
    }

    // Unfiltered for Authors/Admins
    public List<Course> findAllCourses() {
        var sql = """
                SELECT id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                FROM courses
                ORDER BY created_at DESC
                """;
        return jdbcTemplate.query(sql, courseMapper);
    }

    public Optional<Course> findById(UUID id){
        var sql = """
                SELECT id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                FROM courses
                WHERE id = ?
                """;
        return jdbcTemplate.query(sql, courseMapper, id).stream().findFirst();
    }

    public Optional<Course> findBySlug(String slug, boolean includeUnpublished) {
        var sql = includeUnpublished ? 
                """
                SELECT id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                FROM courses
                WHERE slug = ?
                """ : 
                """
                SELECT id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                FROM courses
                WHERE slug = ? AND status = 'PUBLISHED'
                """;

        return jdbcTemplate.query(sql, courseMapper, slug).stream().findFirst();
    }

    public Course save(Course course) {
        var sql = """
                INSERT INTO courses (title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, now())
                RETURNING id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                """;
        return Objects.requireNonNull(
            jdbcTemplate.queryForObject(
                sql,
                courseMapper,
                course.title(),
                course.slug(),
                course.description(),
                course.difficulty().name(),
                course.tag() != null ? course.tag().toString() : "[]",
                course.status().name(),
                course.estimatedMinutes(),
                course.createdBy()
            ),
            "Save did not return a course"
        );
    }

    public Course setStatus(UUID id, String status) {
        var sql = """
                UPDATE courses
                SET status = ?, updated_at = now()
                WHERE id = ?
                RETURNING id, title, slug, description, difficulty, tags, status, estimated_minutes, created_by, created_at, updated_at, archived_at
                """;
        return Objects.requireNonNull(
            jdbcTemplate.queryForObject(
                sql,
                courseMapper,
                status,
                id
            ),
            "Set status did not return a course"
        );
    }   
}
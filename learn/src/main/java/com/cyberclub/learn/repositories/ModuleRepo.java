package com.cyberclub.learn.repositories;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ReorderInput;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Repository
public class ModuleRepo {

    private final JdbcTemplate jdbcTemplate;

    public ModuleRepo(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Module> moduleMapper = (rs, rowNum) ->
            new Module(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("course_id")),
                rs.getString("title"),
                rs.getString("description_md"),
                rs.getInt("position"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
            );

    public List<Module> findAllModules() {
        var sql = """
                SELECT id, course_id, title, description_md, position, created_at, updated_at
                FROM modules
                ORDER BY position ASC
                """;
        return jdbcTemplate.query(sql, moduleMapper);
    }

    public Module findModuleById(UUID id) {
        var sql = """
                SELECT id, course_id, title, description_md, position, created_at, updated_at
                FROM modules
                WHERE id = ?
                """;
        return jdbcTemplate.queryForObject(sql, moduleMapper, id);
    }

    public List<Module> findByCourseId(UUID courseId) {
        var sql = """
                SELECT id, course_id, title, description_md, position, created_at, updated_at
                FROM modules
                WHERE course_id = ?
                ORDER BY position ASC
                """;
        return jdbcTemplate.query(sql, moduleMapper, courseId);
    }

    public List<Module> findByCourseIds(List<UUID> courseIds) {
        if (courseIds.isEmpty()) return List.of();
        
        var inClause = String.join(",", courseIds.stream().map(id -> "'" + id + "'").toList());
        var sql = String.format("""
                SELECT id, course_id, title, description_md, position, created_at, updated_at
                FROM modules
                WHERE course_id IN (%s)
                ORDER BY position ASC
                """, inClause);
        return jdbcTemplate.query(sql, moduleMapper);
    }

    public Module save(UUID courseId, String title, int position) {
        var sql = """
                INSERT INTO modules (course_id, title, position, created_at)
                VALUES (?, ?, ?, now())
                RETURNING id, course_id, title, description_md, position, created_at, updated_at
                """;
        return Objects.requireNonNull(
            jdbcTemplate.queryForObject(sql, moduleMapper, courseId, title, position),
            "Save did not return a module"
        );
    }

    public void updatePosition(List<ReorderInput> items){
        String sql = """
                UPDATE modules
                SET position = ?, updated_at = now()
                WHERE id = ?
                """;
        jdbcTemplate.batchUpdate(sql, items, items.size(), (ps, item)->{
            ps.setInt(1, item.position());
            ps.setObject(2, item.id());
        });
    }
}
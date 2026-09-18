package com.cyberclub.learn.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.Module;

@Repository
public class ModuleRepo {

    private static final String COLUMNS = "id, path_id, title, description_md, position, created_at, updated_at";

    private final JdbcTemplate jdbc;

    public ModuleRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static final RowMapper<Module> MAPPER = (rs, i) -> new Module(
        UUID.fromString(rs.getString("id")),
        UUID.fromString(rs.getString("path_id")),
        rs.getString("title"),
        rs.getString("description_md"),
        rs.getInt("position"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant()
    );

    public Optional<Module> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM modules WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public List<Module> findByPathId(UUID pathId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM modules WHERE path_id = ? ORDER BY position", MAPPER, pathId);
    }

    /** Batch load for {@code Path.modules}. */
    public List<Module> findByPathIds(List<UUID> pathIds) {
        if (pathIds.isEmpty()) return List.of();
        return jdbc.query("SELECT " + COLUMNS + " FROM modules WHERE path_id = ANY(?) ORDER BY path_id, position",
            MAPPER, (Object) pathIds.toArray(new UUID[0]));
    }

    public List<UUID> idsForPath(UUID pathId) {
        return jdbc.queryForList("SELECT id FROM modules WHERE path_id = ?", UUID.class, pathId);
    }

    public int nextPosition(UUID pathId) {
        Integer max = jdbc.queryForObject("SELECT COALESCE(MAX(position), 0) FROM modules WHERE path_id = ?", Integer.class, pathId);
        return (max == null ? 0 : max) + 1;
    }

    public Module insert(UUID pathId, String title, String descriptionMd, int position) {
        return jdbc.queryForObject("""
            INSERT INTO modules (path_id, title, description_md, position)
            VALUES (?, ?, ?, ?)
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, pathId, title, descriptionMd, position);
    }

    public Module update(UUID id, String title, String descriptionMd, Integer position) {
        return jdbc.queryForObject("""
            UPDATE modules
            SET title = ?, description_md = ?, position = COALESCE(?, position), updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, title, descriptionMd, position, id);
    }

    /** Sets positions 1..n in list order. Relies on the DEFERRABLE unique constraint. */
    public void reorder(List<UUID> orderedIds) {
        jdbc.batchUpdate("UPDATE modules SET position = ?, updated_at = now() WHERE id = ?",
            orderedIds, orderedIds.size(), (ps, id) -> {
                ps.setInt(1, orderedIds.indexOf(id) + 1);
                ps.setObject(2, id);
            });
    }

    public boolean delete(UUID id) {
        return jdbc.update("DELETE FROM modules WHERE id = ?", id) > 0;
    }
}

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

import com.cyberclub.learn.dtos.domain.Module;

/**
 * Modules are reusable: a module row has no path; membership and ordering live
 * in {@code path_modules(path_id, module_id, position)}.
 */
@Repository
public class ModuleRepo {

    private static final String COLUMNS = "m.id, m.title, m.description_md, m.created_at, m.updated_at";
    private static final String RETURNING = "id, title, description_md, created_at, updated_at";

    private final JdbcTemplate jdbc;

    public ModuleRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static final RowMapper<Module> MAPPER = (rs, i) -> new Module(
        UUID.fromString(rs.getString("id")),
        rs.getString("title"),
        rs.getString("description_md"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant()
    );

    public Optional<Module> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM modules m WHERE m.id = ?", MAPPER, id).stream().findFirst();
    }

    public List<Module> findByIds(List<UUID> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query("SELECT " + COLUMNS + " FROM modules m WHERE m.id = ANY(?)", MAPPER, (Object) ids.toArray(new UUID[0]));
    }

    /** Author picker: every module, optionally filtered by title. */
    public List<Module> findAll(String search) {
        if (search == null || search.isBlank()) {
            return jdbc.query("SELECT " + COLUMNS + " FROM modules m ORDER BY m.title", MAPPER);
        }
        return jdbc.query("SELECT " + COLUMNS + " FROM modules m WHERE m.title ILIKE ? ORDER BY m.title",
            MAPPER, "%" + search.trim() + "%");
    }

    public List<Module> findByPathId(UUID pathId) {
        return jdbc.query("""
            SELECT %s FROM path_modules pm JOIN modules m ON m.id = pm.module_id
            WHERE pm.path_id = ? ORDER BY pm.position
            """.formatted(COLUMNS), MAPPER, pathId);
    }

    /** Batch load for {@code Path.modules}: pathId → modules in path order (every requested id present). */
    public Map<UUID, List<Module>> findByPathIds(List<UUID> pathIds) {
        Map<UUID, List<Module>> out = new LinkedHashMap<>();
        pathIds.forEach(id -> out.put(id, new ArrayList<>()));
        if (pathIds.isEmpty()) return out;
        jdbc.query("""
            SELECT pm.path_id, %s FROM path_modules pm JOIN modules m ON m.id = pm.module_id
            WHERE pm.path_id = ANY(?) ORDER BY pm.path_id, pm.position
            """.formatted(COLUMNS),
            rs -> { out.get(rs.getObject("path_id", UUID.class)).add(MAPPER.mapRow(rs, 0)); },
            (Object) pathIds.toArray(new UUID[0]));
        return out;
    }

    public List<UUID> idsForPath(UUID pathId) {
        return jdbc.queryForList("SELECT module_id FROM path_modules WHERE path_id = ?", UUID.class, pathId);
    }

    public List<UUID> pathIdsContaining(UUID moduleId) {
        return jdbc.queryForList("SELECT path_id FROM path_modules WHERE module_id = ?", UUID.class, moduleId);
    }

    public Module insert(String title, String descriptionMd) {
        return jdbc.queryForObject("""
            INSERT INTO modules (title, description_md)
            VALUES (?, ?)
            RETURNING %s
            """.formatted(RETURNING), MAPPER, title, descriptionMd);
    }

    public Module update(UUID id, String title, String descriptionMd) {
        return jdbc.queryForObject("""
            UPDATE modules
            SET title = ?, description_md = ?, updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(RETURNING), MAPPER, title, descriptionMd, id);
    }

    // ---------------------------------------------------------------- path_modules

    /** Appends the module to the path; no-op if already linked. Returns true when a link was created. */
    public boolean link(UUID pathId, UUID moduleId) {
        return jdbc.update("""
            INSERT INTO path_modules (path_id, module_id, position)
            SELECT ?, ?, COALESCE(MAX(position), 0) + 1 FROM path_modules WHERE path_id = ?
            ON CONFLICT (path_id, module_id) DO NOTHING
            """, pathId, moduleId, pathId) > 0;
    }

    public boolean unlink(UUID pathId, UUID moduleId) {
        return jdbc.update("DELETE FROM path_modules WHERE path_id = ? AND module_id = ?", pathId, moduleId) > 0;
    }

    /** Sets positions 1..n in list order within one path. Relies on the DEFERRABLE unique constraint. */
    public void reorder(UUID pathId, List<UUID> orderedIds) {
        jdbc.batchUpdate("UPDATE path_modules SET position = ? WHERE path_id = ? AND module_id = ?",
            orderedIds, orderedIds.size(), (ps, id) -> {
                ps.setInt(1, orderedIds.indexOf(id) + 1);
                ps.setObject(2, pathId);
                ps.setObject(3, id);
            });
    }

    /** Deletes the module everywhere (path_modules, lessons, progress cascade). */
    public boolean delete(UUID id) {
        return jdbc.update("DELETE FROM modules WHERE id = ?", id) > 0;
    }
}

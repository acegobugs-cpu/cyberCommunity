package com.cyberclub.learn.repositories;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.learn.dtos.domain.GroupType;
import com.cyberclub.learn.dtos.domain.RoadMap;
import com.cyberclub.learn.dtos.domain.RoadMapItem;
import com.cyberclub.learn.dtos.domain.RoadMapStatus;

@Repository
public class RoadMapRepo {

    private static final String COLUMNS =
        "id, slug, title, description_md, status, created_by, created_at, updated_at, archived_at";
    private static final String ITEM_COLUMNS =
        "id, roadmap_id, path_id, module_id, position, group_type, is_required, created_at";

    private final JdbcTemplate jdbc;

    public RoadMapRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static final RowMapper<RoadMap> MAPPER = (rs, i) -> {
        Timestamp archived = rs.getTimestamp("archived_at");
        return new RoadMap(
            rs.getObject("id", UUID.class),
            rs.getString("slug"),
            rs.getString("title"),
            rs.getString("description_md"),
            RoadMapStatus.valueOf(rs.getString("status")),
            rs.getObject("created_by", UUID.class),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant(),
            archived == null ? null : archived.toInstant()
        );
    };

    static final RowMapper<RoadMapItem> ITEM_MAPPER = (rs, i) -> new RoadMapItem(
        rs.getObject("id", UUID.class),
        rs.getObject("roadmap_id", UUID.class),
        rs.getObject("path_id", UUID.class),
        rs.getObject("module_id", UUID.class),
        rs.getInt("position"),
        GroupType.valueOf(rs.getString("group_type")),
        rs.getBoolean("is_required"),
        rs.getTimestamp("created_at").toInstant()
    );

    // ---------------------------------------------------------------- roadmaps

    /** Catalogue; archived never listed; {@code includeUnpublished=false} restricts to PUBLISHED. */
    public List<RoadMap> find(String search, boolean includeUnpublished) {
        StringBuilder sql = new StringBuilder("SELECT " + COLUMNS + " FROM roadmaps WHERE archived_at IS NULL");
        List<Object> args = new ArrayList<>();
        if (!includeUnpublished) sql.append(" AND status = 'PUBLISHED'");
        if (search != null && !search.isBlank()) {
            sql.append(" AND (title ILIKE ? OR description_md ILIKE ?)");
            String like = "%" + search.trim() + "%";
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY title");
        return jdbc.query(sql.toString(), MAPPER, args.toArray());
    }

    public Optional<RoadMap> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM roadmaps WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public Optional<RoadMap> findBySlug(String slug) {
        return jdbc.query("SELECT " + COLUMNS + " FROM roadmaps WHERE slug = ?", MAPPER, slug).stream().findFirst();
    }

    public boolean slugTaken(String slug, UUID excludeId) {
        Integer n = excludeId == null
            ? jdbc.queryForObject("SELECT COUNT(*) FROM roadmaps WHERE slug = ?", Integer.class, slug)
            : jdbc.queryForObject("SELECT COUNT(*) FROM roadmaps WHERE slug = ? AND id <> ?", Integer.class, slug, excludeId);
        return n != null && n > 0;
    }

    public RoadMap insert(String slug, String title, String descriptionMd, UUID createdBy) {
        return jdbc.queryForObject("""
            INSERT INTO roadmaps (slug, title, description_md, created_by)
            VALUES (?, ?, ?, ?)
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, slug, title, descriptionMd, createdBy);
    }

    public RoadMap update(UUID id, String slug, String title, String descriptionMd) {
        return jdbc.queryForObject("""
            UPDATE roadmaps SET slug = ?, title = ?, description_md = ?, updated_at = now()
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, slug, title, descriptionMd, id);
    }

    public RoadMap setStatus(UUID id, RoadMapStatus status) {
        return jdbc.queryForObject("""
            UPDATE roadmaps
            SET status = ?, updated_at = now(),
                archived_at = CASE WHEN ? = 'ARCHIVED' THEN now() ELSE NULL END
            WHERE id = ?
            RETURNING %s
            """.formatted(COLUMNS), MAPPER, status.name(), status.name(), id);
    }

    public boolean delete(UUID id) {
        return jdbc.update("DELETE FROM roadmaps WHERE id = ?", id) > 0;
    }

    // ---------------------------------------------------------------- items

    /** roadmapId → items in step order (every requested id present). */
    public Map<UUID, List<RoadMapItem>> itemsFor(List<UUID> roadmapIds) {
        Map<UUID, List<RoadMapItem>> out = new LinkedHashMap<>();
        roadmapIds.forEach(id -> out.put(id, new ArrayList<>()));
        if (roadmapIds.isEmpty()) return out;
        jdbc.query("SELECT " + ITEM_COLUMNS + " FROM roadmap_items WHERE roadmap_id = ANY(?) ORDER BY roadmap_id, position, created_at",
            rs -> { out.get(rs.getObject("roadmap_id", UUID.class)).add(ITEM_MAPPER.mapRow(rs, 0)); },
            (Object) roadmapIds.toArray(new UUID[0]));
        return out;
    }

    public int itemCount(UUID roadmapId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM roadmap_items WHERE roadmap_id = ?", Integer.class, roadmapId);
        return n == null ? 0 : n;
    }

    /** Replace the whole item set. Callers validate first. */
    public void replaceItems(UUID roadmapId, List<RoadMapItemInputRow> rows) {
        jdbc.update("DELETE FROM roadmap_items WHERE roadmap_id = ?", roadmapId);
        if (rows.isEmpty()) return;
        jdbc.batchUpdate("""
            INSERT INTO roadmap_items (roadmap_id, path_id, module_id, position, group_type, is_required)
            VALUES (?, ?, ?, ?, ?, ?)
            """, rows, rows.size(), (ps, r) -> {
                ps.setObject(1, roadmapId);
                ps.setObject(2, r.pathId());
                ps.setObject(3, r.moduleId());
                ps.setInt(4, r.position());
                ps.setString(5, r.groupType().name());
                ps.setBoolean(6, r.required());
            });
    }

    /** Validated, renumbered row ready to insert. */
    public record RoadMapItemInputRow(UUID pathId, UUID moduleId, int position, GroupType groupType, boolean required) {}

    // ---------------------------------------------------------------- caller-scoped progress

    /** roadmapId → derived progress for one user (learn.roadmap_progress). */
    public Map<UUID, Double> progressFor(UUID userId, List<UUID> roadmapIds) {
        if (roadmapIds.isEmpty()) return Map.of();
        Map<UUID, Double> out = new LinkedHashMap<>();
        jdbc.query("SELECT r.id, learn.roadmap_progress(?, r.id) AS p FROM roadmaps r WHERE r.id = ANY(?)",
            rs -> { out.put(rs.getObject("id", UUID.class), rs.getBigDecimal("p").doubleValue()); },
            userId, (Object) roadmapIds.toArray(new UUID[0]));
        return out;
    }

    /** itemId → the user's progress on the item's target (enrollment or module progress), 0 when untouched. */
    public Map<UUID, Double> itemProgressFor(UUID userId, List<UUID> itemIds) {
        if (itemIds.isEmpty()) return Map.of();
        Map<UUID, Double> out = new LinkedHashMap<>();
        jdbc.query("""
            SELECT ri.id, COALESCE(e.progress, mp.progress, 0) AS p
            FROM roadmap_items ri
            LEFT JOIN enrollments     e  ON e.path_id    = ri.path_id   AND e.user_id  = ?
            LEFT JOIN module_progress mp ON mp.module_id = ri.module_id AND mp.user_id = ?
            WHERE ri.id = ANY(?)
            """,
            rs -> { out.put(rs.getObject("id", UUID.class), rs.getBigDecimal("p").doubleValue()); },
            userId, userId, (Object) itemIds.toArray(new UUID[0]));
        return out;
    }

    /** Published roadmaps in which the user has touched at least one item, most advanced first. */
    public List<RoadMap> findStarted(UUID userId) {
        return jdbc.query("""
            SELECT %s FROM roadmaps r
            WHERE r.status = 'PUBLISHED'
              AND EXISTS (
                SELECT 1 FROM roadmap_items ri
                LEFT JOIN enrollments     e  ON e.path_id    = ri.path_id   AND e.user_id  = ?
                LEFT JOIN module_progress mp ON mp.module_id = ri.module_id AND mp.user_id = ?
                WHERE ri.roadmap_id = r.id AND (e.user_id IS NOT NULL OR mp.user_id IS NOT NULL)
              )
            ORDER BY learn.roadmap_progress(?, r.id) DESC, r.title
            """.formatted(COLUMNS.replace("id,", "r.id,")), MAPPER, userId, userId, userId);
    }

    /** Which published paths / modules-in-published-paths the given items point at (learner visibility). */
    public java.util.Set<UUID> visibleItemIds(List<UUID> itemIds) {
        if (itemIds.isEmpty()) return java.util.Set.of();
        return jdbc.queryForList("""
            SELECT ri.id FROM roadmap_items ri
            WHERE ri.id = ANY(?)
              AND (
                EXISTS (SELECT 1 FROM paths p WHERE p.id = ri.path_id AND p.status = 'PUBLISHED')
                OR EXISTS (SELECT 1 FROM path_modules pm JOIN paths p ON p.id = pm.path_id
                           WHERE pm.module_id = ri.module_id AND p.status = 'PUBLISHED')
              )
            """, UUID.class, (Object) itemIds.toArray(new UUID[0]))
            .stream().collect(Collectors.toSet());
    }
}

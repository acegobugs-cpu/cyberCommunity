package com.cyberclub.learn.services;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.domain.GroupType;
import com.cyberclub.learn.dtos.domain.RoadMap;
import com.cyberclub.learn.dtos.domain.RoadMapItem;
import com.cyberclub.learn.dtos.domain.RoadMapStatus;
import com.cyberclub.learn.dtos.inputs.RoadMapInput;
import com.cyberclub.learn.dtos.inputs.RoadMapItemInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.ModuleRepo;
import com.cyberclub.learn.repositories.PathRepo;
import com.cyberclub.learn.repositories.RoadMapRepo;
import com.cyberclub.learn.repositories.RoadMapRepo.RoadMapItemInputRow;

/**
 * Roadmaps (L3). Not enrolled: progress is derived from L2 state by
 * {@code learn.roadmap_progress}, see V3 for the rule.
 */
@Service
public class RoadMapService {

    private final RoadMapRepo roadmaps;
    private final PathRepo paths;
    private final ModuleRepo modules;

    public RoadMapService(RoadMapRepo roadmaps, PathRepo paths, ModuleRepo modules) {
        this.roadmaps = roadmaps;
        this.paths = paths;
        this.modules = modules;
    }

    // ---------------------------------------------------------------- reads

    public List<RoadMap> list(String search, boolean includeUnpublished) {
        return roadmaps.find(search, includeUnpublished);
    }

    /** Null (not an error) when missing or hidden from the caller. */
    public RoadMap bySlug(String slug, boolean includeUnpublished) {
        return roadmaps.findBySlug(slug).filter(r -> visible(r, includeUnpublished)).orElse(null);
    }

    public RoadMap byId(UUID id, boolean includeUnpublished) {
        return roadmaps.findById(id).filter(r -> visible(r, includeUnpublished)).orElse(null);
    }

    public List<RoadMap> mine() {
        return roadmaps.findStarted(UserContext.getUserId());
    }

    /**
     * Items grouped for {@code @BatchMapping}. Learners only see items whose
     * target is reachable: a PUBLISHED path, or a module inside one.
     */
    public Map<RoadMap, List<RoadMapItem>> itemsFor(List<RoadMap> parents, boolean includeUnpublished) {
        Map<UUID, List<RoadMapItem>> byRoadmap = roadmaps.itemsFor(parents.stream().map(RoadMap::id).toList());
        if (!includeUnpublished) {
            Set<UUID> visible = roadmaps.visibleItemIds(
                byRoadmap.values().stream().flatMap(List::stream).map(RoadMapItem::id).toList());
            byRoadmap.replaceAll((k, items) -> items.stream().filter(i -> visible.contains(i.id())).toList());
        }
        return parents.stream().collect(Collectors.toMap(
            Function.identity(), r -> byRoadmap.getOrDefault(r.id(), List.of()), (a, b) -> a, java.util.LinkedHashMap::new));
    }

    public Map<UUID, Double> progressFor(List<RoadMap> parents) {
        return roadmaps.progressFor(UserContext.getUserId(), parents.stream().map(RoadMap::id).toList());
    }

    public Map<UUID, Double> itemProgressFor(List<RoadMapItem> items) {
        return roadmaps.itemProgressFor(UserContext.getUserId(), items.stream().map(RoadMapItem::id).toList());
    }

    private static boolean visible(RoadMap r, boolean includeUnpublished) {
        return includeUnpublished || r.status() == RoadMapStatus.PUBLISHED;
    }

    // ---------------------------------------------------------------- author writes

    @Transactional
    public RoadMap upsert(RoadMapInput in) {
        String title = PathService.required(in.title(), "title");
        if (in.id() == null) {
            String slug = in.slug() == null || in.slug().isBlank() ? PathService.slugify(title) : validSlug(in.slug());
            if (roadmaps.slugTaken(slug, null)) throw new BadRequestException("slug already in use: " + slug);
            try {
                return roadmaps.insert(slug, title, in.descriptionMd(), UserContext.getUserId());
            } catch (DuplicateKeyException e) {
                throw new BadRequestException("slug already in use: " + slug);
            }
        }
        RoadMap existing = roadmaps.findById(in.id()).orElseThrow(() -> new NotFoundException("roadmap not found"));
        String slug = in.slug() == null || in.slug().isBlank() ? existing.slug() : validSlug(in.slug());
        if (roadmaps.slugTaken(slug, existing.id())) throw new BadRequestException("slug already in use: " + slug);
        try {
            return roadmaps.update(existing.id(), slug, title, in.descriptionMd());
        } catch (DuplicateKeyException e) {
            throw new BadRequestException("slug already in use: " + slug);
        }
    }

    /**
     * Replaces the item set. Rules: exactly one target per item; targets must
     * exist and appear at most once; items sharing a position share a
     * groupType; positions are renumbered densely from 1 in ascending order.
     */
    @Transactional
    public RoadMap setItems(UUID roadmapId, List<RoadMapItemInput> items) {
        RoadMap r = roadmaps.findById(roadmapId).orElseThrow(() -> new NotFoundException("roadmap not found"));
        if (items == null) items = List.of();

        Set<UUID> pathIds = new HashSet<>();
        Set<UUID> moduleIds = new HashSet<>();
        Map<Integer, GroupType> stepType = new HashMap<>();
        for (RoadMapItemInput in : items) {
            boolean hasPath = in.pathId() != null, hasModule = in.moduleId() != null;
            if (hasPath == hasModule) throw new BadRequestException("each item needs exactly one of pathId / moduleId");
            if (in.position() < 1) throw new BadRequestException("position must be >= 1");
            if (hasPath && !pathIds.add(in.pathId())) throw new BadRequestException("path listed twice: " + in.pathId());
            if (hasModule && !moduleIds.add(in.moduleId())) throw new BadRequestException("module listed twice: " + in.moduleId());
            GroupType type = in.groupType() == null ? GroupType.ALL : in.groupType();
            GroupType prev = stepType.putIfAbsent(in.position(), type);
            if (prev != null && prev != type) {
                throw new BadRequestException("items at step " + in.position() + " must share one groupType");
            }
        }
        if (!pathIds.isEmpty()) {
            Set<UUID> found = paths.findByIds(List.copyOf(pathIds)).stream().map(p -> p.id()).collect(Collectors.toSet());
            pathIds.stream().filter(id -> !found.contains(id)).findFirst()
                .ifPresent(id -> { throw new NotFoundException("path not found: " + id); });
        }
        for (UUID m : moduleIds) {
            modules.findById(m).orElseThrow(() -> new NotFoundException("module not found: " + m));
        }

        // dense renumbering keeps steps 1..n even if the author sent 1, 5, 9
        List<Integer> steps = List.copyOf(new TreeSet<>(stepType.keySet()));
        List<RoadMapItemInputRow> rows = items.stream().map(in -> new RoadMapItemInputRow(
            in.pathId(), in.moduleId(),
            steps.indexOf(in.position()) + 1,
            stepType.get(in.position()),
            in.isRequired() == null || in.isRequired())).toList();

        roadmaps.replaceItems(r.id(), rows);
        return r;
    }

    @Transactional
    public RoadMap publish(UUID id, boolean published) {
        RoadMap r = roadmaps.findById(id).orElseThrow(() -> new NotFoundException("roadmap not found"));
        if (r.status() == RoadMapStatus.ARCHIVED) throw new BadRequestException("archived roadmaps cannot be published");
        if (published && roadmaps.itemCount(id) == 0) {
            throw new BadRequestException("a roadmap needs at least one item before it can be published");
        }
        return roadmaps.setStatus(id, published ? RoadMapStatus.PUBLISHED : RoadMapStatus.DRAFT);
    }

    @Transactional
    public RoadMap archive(UUID id) {
        roadmaps.findById(id).orElseThrow(() -> new NotFoundException("roadmap not found"));
        return roadmaps.setStatus(id, RoadMapStatus.ARCHIVED);
    }

    @Transactional
    public boolean delete(UUID id) {
        roadmaps.findById(id).orElseThrow(() -> new NotFoundException("roadmap not found"));
        return roadmaps.delete(id);
    }

    private static String validSlug(String slug) {
        String s = slug.trim().toLowerCase(java.util.Locale.ROOT);
        if (!s.matches("^[a-z0-9]+(-[a-z0-9]+)*$")) {
            throw new BadRequestException("slug must be lowercase letters, digits and single hyphens");
        }
        return s;
    }
}

package com.cyberclub.learn.services;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.inputs.ModuleInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.PathRepo;
import com.cyberclub.learn.repositories.ModuleRepo;
import com.cyberclub.learn.repositories.ProgressRepo;

@Service
public class ModuleService {

    private final ModuleRepo moduleRepo;
    private final PathRepo pathRepo;
    private final ProgressRepo progressRepo;

    public ModuleService(ModuleRepo moduleRepo, PathRepo pathRepo, ProgressRepo progressRepo) {
        this.moduleRepo = moduleRepo;
        this.pathRepo = pathRepo;
        this.progressRepo = progressRepo;
    }

    public Module byId(UUID id) {
        return moduleRepo.findById(id).orElseThrow(() -> new NotFoundException("module not found"));
    }

    /** Author picker for reuse. */
    public List<Module> list(String search) {
        return moduleRepo.findAll(search);
    }

    /** One query for all paths in the batch, grouped for {@code @BatchMapping}. */
    public Map<Path, List<Module>> forPaths(List<Path> paths) {
        Map<UUID, List<Module>> byPath = moduleRepo.findByPathIds(paths.stream().map(Path::id).toList());
        return paths.stream().collect(Collectors.toMap(
            Function.identity(),
            c -> byPath.getOrDefault(c.id(), List.of()),
            (a, b) -> a,
            java.util.LinkedHashMap::new));
    }

    /** Create (optionally appending to {@code pathId}) or update title/description. */
    @Transactional
    public Module upsert(ModuleInput in) {
        String title = PathService.required(in.title(), "title");
        if (in.id() == null) {
            Module created = moduleRepo.insert(title, in.descriptionMd());
            if (in.pathId() != null) addToPath(in.pathId(), created.id());
            return created;
        }
        Module existing = byId(in.id());
        return moduleRepo.update(existing.id(), title, in.descriptionMd());
    }

    /** Appends an existing module to a path (idempotent). */
    @Transactional
    public void addToPath(UUID pathId, UUID moduleId) {
        pathRepo.findById(pathId).orElseThrow(() -> new NotFoundException("path not found"));
        byId(moduleId);
        if (moduleRepo.link(pathId, moduleId)) {
            pathRepo.refreshEstimatedMinutes(pathId);
            progressRepo.recomputeAllForPath(pathId);
        }
    }

    /** Unlinks a module from a path; the module and its lessons survive. */
    @Transactional
    public void removeFromPath(UUID pathId, UUID moduleId) {
        if (!moduleRepo.unlink(pathId, moduleId)) {
            throw new NotFoundException("module is not part of this path");
        }
        renumber(pathId);
        pathRepo.refreshEstimatedMinutes(pathId);
        progressRepo.recomputeAllForPath(pathId);
    }

    /**
     * orderedIds must be exactly the set of the path's module ids (no missing,
     * no extra, no duplicates); positions become 1..n in the given order.
     */
    @Transactional
    public void reorder(UUID pathId, List<UUID> orderedIds) {
        validateReorder(new HashSet<>(moduleRepo.idsForPath(pathId)), orderedIds, "module");
        moduleRepo.reorder(pathId, orderedIds);
    }

    /** Deletes the module from every path it belongs to. */
    @Transactional
    public boolean delete(UUID id) {
        byId(id);
        List<UUID> affected = moduleRepo.pathIdsContaining(id);
        boolean deleted = moduleRepo.delete(id);
        for (UUID pathId : affected) {
            renumber(pathId);
            pathRepo.refreshEstimatedMinutes(pathId);
            progressRepo.recomputeAllForPath(pathId);
        }
        return deleted;
    }

    /** Keep a path's module positions contiguous after a removal. */
    private void renumber(UUID pathId) {
        List<UUID> rest = moduleRepo.findByPathId(pathId).stream().map(Module::id).toList();
        if (!rest.isEmpty()) moduleRepo.reorder(pathId, rest);
    }

    static void validateReorder(Set<UUID> actual, List<UUID> orderedIds, String kind) {
        if (orderedIds == null || orderedIds.isEmpty()) {
            throw new BadRequestException("orderedIds must not be empty");
        }
        Set<UUID> given = new HashSet<>(orderedIds);
        if (given.size() != orderedIds.size()) {
            throw new BadRequestException("orderedIds contains duplicates");
        }
        if (!given.equals(actual)) {
            throw new BadRequestException("orderedIds must contain exactly the " + kind + "s of the parent ("
                + actual.size() + " expected, " + given.size() + " given)");
        }
    }
}

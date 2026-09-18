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

@Service
public class ModuleService {

    private final ModuleRepo moduleRepo;
    private final PathRepo pathRepo;

    public ModuleService(ModuleRepo moduleRepo, PathRepo pathRepo) {
        this.moduleRepo = moduleRepo;
        this.pathRepo = pathRepo;
    }

    public Module byId(UUID id) {
        return moduleRepo.findById(id).orElseThrow(() -> new NotFoundException("module not found"));
    }

    /** One query for all paths in the batch, grouped for {@code @BatchMapping}. */
    public Map<Path, List<Module>> forPaths(List<Path> paths) {
        Map<UUID, List<Module>> byPath = moduleRepo
            .findByPathIds(paths.stream().map(Path::id).toList())
            .stream()
            .collect(Collectors.groupingBy(Module::pathId));
        return paths.stream().collect(Collectors.toMap(
            Function.identity(),
            c -> byPath.getOrDefault(c.id(), List.of()),
            (a, b) -> a,
            java.util.LinkedHashMap::new));
    }

    @Transactional
    public Module upsert(ModuleInput in) {
        String title = PathService.required(in.title(), "title");
        if (in.id() == null) {
            pathRepo.findById(in.pathId()).orElseThrow(() -> new NotFoundException("path not found"));
            int position = in.position() == null ? moduleRepo.nextPosition(in.pathId()) : in.position();
            return moduleRepo.insert(in.pathId(), title, in.descriptionMd(), position);
        }
        Module existing = byId(in.id());
        if (!existing.pathId().equals(in.pathId())) {
            throw new BadRequestException("modules cannot be moved between paths");
        }
        return moduleRepo.update(existing.id(), title, in.descriptionMd(), in.position());
    }

    /**
     * orderedIds must be exactly the set of the path's module ids (no missing,
     * no extra, no duplicates); positions become 1..n in the given order.
     */
    @Transactional
    public void reorder(UUID pathId, List<UUID> orderedIds) {
        validateReorder(new HashSet<>(moduleRepo.idsForPath(pathId)), orderedIds, "module");
        moduleRepo.reorder(orderedIds);
    }

    @Transactional
    public boolean delete(UUID id) {
        Module m = byId(id);
        boolean deleted = moduleRepo.delete(id);
        // renumber the remaining siblings so positions stay contiguous
        List<UUID> rest = moduleRepo.findByPathId(m.pathId()).stream().map(Module::id).toList();
        if (!rest.isEmpty()) moduleRepo.reorder(rest);
        pathRepo.refreshEstimatedMinutes(m.pathId());
        return deleted;
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

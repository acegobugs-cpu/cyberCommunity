package com.cyberclub.learn.services;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.dtos.domain.PathStatus;
import com.cyberclub.learn.dtos.domain.Difficulty;
import com.cyberclub.learn.dtos.inputs.PathInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.PathRepo;
import com.cyberclub.learn.repositories.ModuleRepo;

@Service
public class PathService {

    private final PathRepo pathRepo;
    private final ModuleRepo moduleRepo;

    public PathService(PathRepo pathRepo, ModuleRepo moduleRepo) {
        this.pathRepo = pathRepo;
        this.moduleRepo = moduleRepo;
    }

    // ---------- reads ----------

    public List<Path> list(Difficulty difficulty, String tag, String search, boolean includeUnpublished) {
        return pathRepo.find(difficulty, tag, search, includeUnpublished);
    }

    /** Returns null (not an error) when the path is missing or hidden from the caller. */
    public Path bySlug(String slug, boolean includeUnpublished) {
        return pathRepo.findBySlug(slug).filter(c -> visible(c, includeUnpublished)).orElse(null);
    }

    public Path byId(UUID id, boolean includeUnpublished) {
        return pathRepo.findById(id).filter(c -> visible(c, includeUnpublished)).orElse(null);
    }

    /** id → path; enrolled paths stay visible to their learner even after unpublishing. */
    public java.util.Map<UUID, Path> byIds(List<UUID> ids) {
        return pathRepo.findByIds(ids).stream().collect(java.util.stream.Collectors.toMap(Path::id, p -> p));
    }

    private static boolean visible(Path c, boolean includeUnpublished) {
        return includeUnpublished || c.status() == PathStatus.PUBLISHED;
    }

    // ---------- author writes ----------

    @Transactional
    public Path upsert(PathInput in) {
        String title = required(in.title(), "title");
        Difficulty difficulty = in.difficulty() == null ? Difficulty.BEGINNER : in.difficulty();
        List<String> tags = in.tags() == null ? List.of() : in.tags().stream().map(String::trim).filter(t -> !t.isEmpty()).distinct().toList();

        if (in.id() == null) {
            String slug = in.slug() == null || in.slug().isBlank() ? slugify(title) : validSlug(in.slug());
            if (pathRepo.slugTaken(slug, null)) {
                throw new BadRequestException("slug already in use: " + slug);
            }
            try {
                return pathRepo.insert(slug, title, in.description(), difficulty, tags, UserContext.getUserId());
            } catch (DuplicateKeyException e) {
                throw new BadRequestException("slug already in use: " + slug);
            }
        }

        Path existing = pathRepo.findById(in.id()).orElseThrow(() -> new NotFoundException("path not found"));
        String slug = in.slug() == null || in.slug().isBlank() ? existing.slug() : validSlug(in.slug());
        if (pathRepo.slugTaken(slug, existing.id())) {
            throw new BadRequestException("slug already in use: " + slug);
        }
        try {
            return pathRepo.update(existing.id(), slug, title, in.description(), difficulty, tags);
        } catch (DuplicateKeyException e) {
            throw new BadRequestException("slug already in use: " + slug);
        }
    }

    @Transactional
    public Path publish(UUID id, boolean published) {
        Path c = pathRepo.findById(id).orElseThrow(() -> new NotFoundException("path not found"));
        if (c.status() == PathStatus.ARCHIVED) {
            throw new BadRequestException("archived paths cannot be published");
        }
        if (published && moduleRepo.idsForPath(id).isEmpty()) {
            throw new BadRequestException("a path needs at least one module before it can be published");
        }
        return pathRepo.setStatus(id, published ? PathStatus.PUBLISHED : PathStatus.DRAFT);
    }

    @Transactional
    public Path archive(UUID id) {
        pathRepo.findById(id).orElseThrow(() -> new NotFoundException("path not found"));
        return pathRepo.setStatus(id, PathStatus.ARCHIVED);
    }

    // ---------- helpers ----------

    static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(field + " is required");
        }
        return value.trim();
    }

    static String slugify(String title) {
        String s = Normalizer.normalize(title, Normalizer.Form.NFKD)
            .replaceAll("[^\\p{ASCII}]", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        return s.isEmpty() ? "path-" + UUID.randomUUID().toString().substring(0, 8) : s;
    }

    private static String validSlug(String slug) {
        String s = slug.trim().toLowerCase(Locale.ROOT);
        if (!s.matches("^[a-z0-9]+(-[a-z0-9]+)*$")) {
            throw new BadRequestException("slug must be lowercase letters, digits and single hyphens");
        }
        return s;
    }
}

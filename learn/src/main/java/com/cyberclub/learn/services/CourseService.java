package com.cyberclub.learn.services;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.CourseStatus;
import com.cyberclub.learn.dtos.domain.Difficulty;
import com.cyberclub.learn.dtos.inputs.CourseInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.CourseRepo;
import com.cyberclub.learn.repositories.ModuleRepo;

@Service
public class CourseService {

    private final CourseRepo courseRepo;
    private final ModuleRepo moduleRepo;

    public CourseService(CourseRepo courseRepo, ModuleRepo moduleRepo) {
        this.courseRepo = courseRepo;
        this.moduleRepo = moduleRepo;
    }

    // ---------- reads ----------

    public List<Course> list(Difficulty difficulty, String tag, String search, boolean includeUnpublished) {
        return courseRepo.find(difficulty, tag, search, includeUnpublished);
    }

    /** Returns null (not an error) when the course is missing or hidden from the caller. */
    public Course bySlug(String slug, boolean includeUnpublished) {
        return courseRepo.findBySlug(slug).filter(c -> visible(c, includeUnpublished)).orElse(null);
    }

    public Course byId(UUID id, boolean includeUnpublished) {
        return courseRepo.findById(id).filter(c -> visible(c, includeUnpublished)).orElse(null);
    }

    private static boolean visible(Course c, boolean includeUnpublished) {
        return includeUnpublished || c.status() == CourseStatus.PUBLISHED;
    }

    // ---------- author writes ----------

    @Transactional
    public Course upsert(CourseInput in) {
        String title = required(in.title(), "title");
        Difficulty difficulty = in.difficulty() == null ? Difficulty.BEGINNER : in.difficulty();
        List<String> tags = in.tags() == null ? List.of() : in.tags().stream().map(String::trim).filter(t -> !t.isEmpty()).distinct().toList();

        if (in.id() == null) {
            String slug = in.slug() == null || in.slug().isBlank() ? slugify(title) : validSlug(in.slug());
            if (courseRepo.slugTaken(slug, null)) {
                throw new BadRequestException("slug already in use: " + slug);
            }
            try {
                return courseRepo.insert(slug, title, in.description(), difficulty, tags, UserContext.getUserId());
            } catch (DuplicateKeyException e) {
                throw new BadRequestException("slug already in use: " + slug);
            }
        }

        Course existing = courseRepo.findById(in.id()).orElseThrow(() -> new NotFoundException("course not found"));
        String slug = in.slug() == null || in.slug().isBlank() ? existing.slug() : validSlug(in.slug());
        if (courseRepo.slugTaken(slug, existing.id())) {
            throw new BadRequestException("slug already in use: " + slug);
        }
        try {
            return courseRepo.update(existing.id(), slug, title, in.description(), difficulty, tags);
        } catch (DuplicateKeyException e) {
            throw new BadRequestException("slug already in use: " + slug);
        }
    }

    @Transactional
    public Course publish(UUID id, boolean published) {
        Course c = courseRepo.findById(id).orElseThrow(() -> new NotFoundException("course not found"));
        if (c.status() == CourseStatus.ARCHIVED) {
            throw new BadRequestException("archived courses cannot be published");
        }
        if (published && moduleRepo.idsForCourse(id).isEmpty()) {
            throw new BadRequestException("a course needs at least one module before it can be published");
        }
        return courseRepo.setStatus(id, published ? CourseStatus.PUBLISHED : CourseStatus.DRAFT);
    }

    @Transactional
    public Course archive(UUID id) {
        courseRepo.findById(id).orElseThrow(() -> new NotFoundException("course not found"));
        return courseRepo.setStatus(id, CourseStatus.ARCHIVED);
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
        return s.isEmpty() ? "course-" + UUID.randomUUID().toString().substring(0, 8) : s;
    }

    private static String validSlug(String slug) {
        String s = slug.trim().toLowerCase(Locale.ROOT);
        if (!s.matches("^[a-z0-9]+(-[a-z0-9]+)*$")) {
            throw new BadRequestException("slug must be lowercase letters, digits and single hyphens");
        }
        return s;
    }
}

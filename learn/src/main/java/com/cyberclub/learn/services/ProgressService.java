package com.cyberclub.learn.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.domain.Enrollment;
import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ModuleProgress;
import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.dtos.domain.PathStatus;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.LessonRepo;
import com.cyberclub.learn.repositories.ModuleRepo;
import com.cyberclub.learn.repositories.PathRepo;
import com.cyberclub.learn.repositories.ProgressRepo;

/**
 * Learner progress (Plan 01 · L2). The caller is always {@link UserContext};
 * there is no userId argument on any of these operations.
 *
 *   path    ENROLLED ─▶ COMPLETED   (all modules complete)   ─▶ DROPPED (explicit)
 *   module  STARTED ─▶ IN_PROGRESS ─▶ COMPLETED               ─▶ DROPPED (explicit)
 *   lesson  completed or not
 *
 * Completing a lesson implicitly enrolls in its path and starts its module.
 * Numbers are recomputed by the database (V2 trigger); see ProgressRepo.
 */
@Service
public class ProgressService {

    private final ProgressRepo progress;
    private final PathRepo paths;
    private final ModuleRepo modules;
    private final LessonRepo lessons;

    public ProgressService(ProgressRepo progress, PathRepo paths, ModuleRepo modules, LessonRepo lessons) {
        this.progress = progress;
        this.paths = paths;
        this.modules = modules;
        this.lessons = lessons;
    }

    // ---------------------------------------------------------------- writes

    @Transactional
    public Enrollment enroll(UUID pathId) {
        Path p = paths.findById(pathId).orElseThrow(() -> new NotFoundException("path not found"));
        if (p.status() != PathStatus.PUBLISHED) {
            throw new BadRequestException("only published paths can be enrolled");
        }
        return progress.enroll(UserContext.getUserId(), pathId);
    }

    @Transactional
    public Enrollment drop(UUID pathId) {
        return progress.drop(UserContext.getUserId(), pathId)
            .orElseThrow(() -> new NotFoundException("no active enrollment for this path"));
    }

    @Transactional
    public ModuleProgress startModule(UUID moduleId, UUID pathId) {
        modules.findById(moduleId).orElseThrow(() -> new NotFoundException("module not found"));
        UUID user = UserContext.getUserId();
        enrollTarget(moduleId, pathId).ifPresent(p -> progress.enroll(user, p));
        return progress.startModule(user, moduleId);
    }

    @Transactional
    public ModuleProgress dropModule(UUID moduleId) {
        return progress.dropModule(UserContext.getUserId(), moduleId)
            .orElseThrow(() -> new NotFoundException("module not started"));
    }

    /**
     * Marks a lesson complete (idempotent). Enrolls in the path and starts the
     * module if needed, so a learner can dive into any published lesson.
     * Only READING and VIDEO lessons can be completed by the learner; other
     * types complete through their own mechanism (quiz pass, lab, review).
     */
    @Transactional
    public Lesson completeLesson(UUID lessonId, UUID pathId) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new NotFoundException("lesson not found"));
        switch (lesson.type()) {
            case READING, VIDEO -> { }
            default -> throw new BadRequestException(lesson.type() + " lessons are completed through their own activity");
        }
        recordCompletion(lesson, pathId);
        return lesson;
    }

    /**
     * The shared "this lesson is now done" step used by manual completion and
     * by typed activities (a passed quiz, later labs/projects): implicit enroll
     * + module start, then the completed_lessons insert that fires the trigger.
     */
    @Transactional
    public void recordCompletion(Lesson lesson, UUID pathId) {
        UUID user = UserContext.getUserId();
        enrollTarget(lesson.moduleId(), pathId).ifPresent(p -> progress.enroll(user, p));
        progress.startModule(user, lesson.moduleId());
        progress.completeLesson(user, lesson.id());   // trigger recomputes module + every containing path
    }

    /** Throws BAD_REQUEST unless the lesson's module sits in a published path (and in {@code pathId} when given). */
    public void requireReachable(UUID moduleId, UUID pathId) {
        enrollTarget(moduleId, pathId);
    }

    /**
     * Modules are shared between paths, so "which path does an implicit
     * enrollment go to?" needs an answer: the caller's {@code pathId} when
     * given (must be published and include the module); otherwise the single
     * published path that includes the module, or none when it is ambiguous.
     * Module progress is recorded either way and flows into any existing
     * enrollment through the trigger.
     */
    private Optional<UUID> enrollTarget(UUID moduleId, UUID pathId) {
        List<Path> published = paths.findPublishedContaining(moduleId);
        if (published.isEmpty()) throw new BadRequestException("module is not part of any published path");
        if (pathId == null) {
            return published.size() == 1 ? Optional.of(published.get(0).id()) : Optional.empty();
        }
        if (published.stream().noneMatch(p -> p.id().equals(pathId))) {
            throw new BadRequestException("module is not part of that published path");
        }
        return Optional.of(pathId);
    }

    /** Author edited a module's lessons: keep everyone's cached numbers honest. */
    @Transactional
    public void recomputeModule(UUID moduleId) {
        progress.recomputeAll(moduleId);
    }

    // ---------------------------------------------------------------- reads (caller-scoped)

    public Map<UUID, Enrollment> enrollmentsFor(List<Path> ps) {
        return progress.enrollmentsFor(UserContext.getUserId(), ps.stream().map(Path::id).toList());
    }

    public Map<UUID, ModuleProgress> moduleProgressFor(List<Module> ms) {
        return progress.moduleProgressFor(UserContext.getUserId(), ms.stream().map(Module::id).toList());
    }

    public Set<UUID> completedLessonIds(List<Lesson> ls) {
        return progress.completedLessonIds(UserContext.getUserId(), ls.stream().map(Lesson::id).toList());
    }

    public List<Enrollment> myEnrollments() {
        return progress.activeEnrollments(UserContext.getUserId());
    }

    public Optional<UUID> nextLesson(UUID pathId) {
        return progress.nextLessonId(UserContext.getUserId(), pathId);
    }
}

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
    public ModuleProgress startModule(UUID moduleId) {
        Module m = modules.findById(moduleId).orElseThrow(() -> new NotFoundException("module not found"));
        UUID user = UserContext.getUserId();
        progress.enroll(user, m.pathId());
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
    public Lesson completeLesson(UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new NotFoundException("lesson not found"));
        switch (lesson.type()) {
            case READING, VIDEO -> { }
            default -> throw new BadRequestException(lesson.type() + " lessons are completed through their own activity");
        }
        Module m = modules.findById(lesson.moduleId()).orElseThrow(() -> new NotFoundException("module not found"));
        Path p = paths.findById(m.pathId()).orElseThrow(() -> new NotFoundException("path not found"));
        if (p.status() != PathStatus.PUBLISHED) {
            throw new BadRequestException("lesson is not published");
        }

        UUID user = UserContext.getUserId();
        progress.enroll(user, p.id());
        progress.startModule(user, m.id());
        progress.completeLesson(user, lessonId);   // trigger recomputes module + path
        return lesson;
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

package com.cyberclub.learn.services;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.inputs.LessonInput;
import com.cyberclub.learn.exceptions.BadRequestException;
import com.cyberclub.learn.exceptions.NotFoundException;
import com.cyberclub.learn.repositories.PathRepo;
import com.cyberclub.learn.repositories.ProgressRepo;
import com.cyberclub.learn.repositories.LessonRepo;
import com.cyberclub.learn.repositories.ModuleRepo;

@Service
public class LessonService {

    private final LessonRepo lessonRepo;
    private final ModuleRepo moduleRepo;
    private final PathRepo pathRepo;
    private final ProgressRepo progressRepo;

    public LessonService(LessonRepo lessonRepo, ModuleRepo moduleRepo, PathRepo pathRepo, ProgressRepo progressRepo) {
        this.progressRepo = progressRepo;
        this.lessonRepo = lessonRepo;
        this.moduleRepo = moduleRepo;
        this.pathRepo = pathRepo;
    }

    /** Null when missing, or when no path that includes it is published and the caller is a learner. */
    public Lesson byId(UUID id, boolean includeUnpublished) {
        Lesson lesson = lessonRepo.findById(id).orElse(null);
        if (lesson == null) return null;
        if (includeUnpublished) return lesson;
        return lessonRepo.inPublishedPath(id) ? lesson : null;
    }

    public Map<Module, List<Lesson>> forModules(List<Module> modules) {
        Map<UUID, List<Lesson>> byModule = lessonRepo
            .findByModuleIds(modules.stream().map(Module::id).toList())
            .stream()
            .collect(Collectors.groupingBy(Lesson::moduleId));
        return modules.stream().collect(Collectors.toMap(
            Function.identity(),
            m -> byModule.getOrDefault(m.id(), List.of()),
            (a, b) -> a,
            java.util.LinkedHashMap::new));
    }

    @Transactional
    public Lesson upsert(LessonInput in) {
        String title = PathService.required(in.title(), "title");
        LessonType type = in.type() == null ? LessonType.READING : in.type();
        if (type == LessonType.EXERCISE) {
            throw new BadRequestException("EXERCISE lessons are not available yet");
        }
        if (type == LessonType.VIDEO && (in.videoUrl() == null || in.videoUrl().isBlank())) {
            throw new BadRequestException("VIDEO lessons need a videoUrl");
        }
        int minutes = in.estimatedMinutes() == null ? 0 : in.estimatedMinutes();
        if (minutes < 0) throw new BadRequestException("estimatedMinutes must be >= 0");

        Module module = moduleRepo.findById(in.moduleId()).orElseThrow(() -> new NotFoundException("module not found"));

        Lesson saved;
        if (in.id() == null) {
            int position = in.position() == null ? lessonRepo.nextPosition(in.moduleId()) : in.position();
            saved = lessonRepo.insert(in.moduleId(), title, type, in.contentMd(), in.videoUrl(), minutes, position);
        } else {
            Lesson existing = lessonRepo.findById(in.id()).orElseThrow(() -> new NotFoundException("lesson not found"));
            if (!existing.moduleId().equals(in.moduleId())) {
                throw new BadRequestException("lessons cannot be moved between modules");
            }
            saved = lessonRepo.update(existing.id(), title, type, in.contentMd(), in.videoUrl(), minutes, in.position());
        }
        pathRepo.refreshEstimatedMinutesForModule(module.id());
        if (in.id() == null) progressRepo.recomputeAll(module.id()); // new lesson changes everyone's ratio
        return saved;
    }

    @Transactional
    public void reorder(UUID moduleId, List<UUID> orderedIds) {
        ModuleService.validateReorder(new HashSet<>(lessonRepo.idsForModule(moduleId)), orderedIds, "lesson");
        lessonRepo.reorder(orderedIds);
    }

    @Transactional
    public boolean delete(UUID id) {
        Lesson l = lessonRepo.findById(id).orElseThrow(() -> new NotFoundException("lesson not found"));
        boolean deleted = lessonRepo.delete(id);
        List<UUID> rest = lessonRepo.findByModuleIds(List.of(l.moduleId())).stream().map(Lesson::id).toList();
        if (!rest.isEmpty()) lessonRepo.reorder(rest);
        pathRepo.refreshEstimatedMinutesForModule(l.moduleId());
        progressRepo.recomputeAll(l.moduleId());
        return deleted;
    }
}

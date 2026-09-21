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
import com.cyberclub.learn.dtos.domain.LessonDoc;
import com.cyberclub.learn.dtos.domain.LessonDocKind;
import com.cyberclub.learn.dtos.inputs.LessonDocInput;
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

    // ---------- document tree ----------

    /** lessonId → docs for {@code Lesson.docs}. */
    public Map<Lesson, List<LessonDoc>> docsFor(List<Lesson> lessons) {
        Map<UUID, List<LessonDoc>> byLesson = lessonRepo.docsFor(lessons.stream().map(Lesson::id).toList());
        return lessons.stream().collect(Collectors.toMap(
            Function.identity(), l -> byLesson.getOrDefault(l.id(), List.of()), (a, b) -> a, java.util.LinkedHashMap::new));
    }

    /**
     * Replaces a lesson's document tree. Paths are normalised (trimmed, no
     * leading/trailing slashes, single slashes) and must be unique; DOC rows
     * need contentMd, VIDEO rows need videoUrl. A path may not be both a file
     * and a folder ("a" and "a/b").
     */
    @Transactional
    public Lesson setDocs(UUID lessonId, List<LessonDocInput> docs) {
        Lesson lesson = lessonRepo.findById(lessonId).orElseThrow(() -> new NotFoundException("lesson not found"));
        List<LessonRepo.DocRow> rows = new java.util.ArrayList<>();
        java.util.Set<String> paths = new HashSet<>();
        for (LessonDocInput in : docs == null ? List.<LessonDocInput>of() : docs) {
            String path = normalisePath(in.path());
            if (!paths.add(path)) throw new BadRequestException("duplicate doc path: " + path);
            LessonDocKind kind = in.kind() == null ? LessonDocKind.DOC : in.kind();
            String title = PathService.required(in.title(), "doc title (" + path + ")");
            if (kind == LessonDocKind.DOC && (in.contentMd() == null || in.contentMd().isBlank())) {
                throw new BadRequestException("DOC " + path + " needs contentMd");
            }
            if (kind == LessonDocKind.VIDEO && (in.videoUrl() == null || in.videoUrl().isBlank())) {
                throw new BadRequestException("VIDEO " + path + " needs videoUrl");
            }
            rows.add(new LessonRepo.DocRow(path, kind, title, in.contentMd(), in.videoUrl()));
        }
        for (String p : paths) {
            if (paths.stream().anyMatch(q -> q.startsWith(p + "/"))) {
                throw new BadRequestException("path is both a file and a folder: " + p);
            }
        }
        lessonRepo.replaceDocs(lesson.id(), rows);
        return lesson;
    }

    static String normalisePath(String raw) {
        if (raw == null || raw.isBlank()) throw new BadRequestException("doc path is required");
        String p = raw.trim().replaceAll("/{2,}", "/").replaceAll("(^/|/$)", "");
        if (p.isEmpty() || p.contains("..") || p.chars().anyMatch(c -> c < 0x20)) {
            throw new BadRequestException("invalid doc path: " + raw);
        }
        return p;
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

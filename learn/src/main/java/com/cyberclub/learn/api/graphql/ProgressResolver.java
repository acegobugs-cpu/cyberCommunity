package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.dtos.domain.Enrollment;
import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ModuleProgress;
import com.cyberclub.learn.dtos.domain.Path;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.PathService;
import com.cyberclub.learn.services.ProgressService;

/**
 * Learner progress (L2). Caller-scoped fields on Path / Module / Lesson are
 * batch-loaded; the parent resolver already authorized the request.
 */
@Controller
public class ProgressResolver {

    private final AuthService auth;
    private final ProgressService progress;
    private final PathService paths;

    public ProgressResolver(AuthService auth, ProgressService progress, PathService paths) {
        this.auth = auth;
        this.progress = progress;
        this.paths = paths;
    }

    // ---------------------------------------------------------------- queries

    @QueryMapping
    public List<Path> myEnrollments() {
        auth.require(Policies.LEARNER);
        List<Enrollment> es = progress.myEnrollments();
        Map<UUID, Path> byId = paths.byIds(es.stream().map(Enrollment::pathId).toList());
        return es.stream().map(e -> byId.get(e.pathId())).filter(p -> p != null).toList();
    }

    // ---------------------------------------------------------------- caller-scoped fields

    @BatchMapping(typeName = "Path", field = "enrollment")
    public Map<Path, Enrollment> enrollment(List<Path> parents) {
        Map<UUID, Enrollment> byPath = progress.enrollmentsFor(parents);
        return parents.stream()
            .filter(p -> byPath.containsKey(p.id()))
            .collect(Collectors.toMap(Function.identity(), p -> byPath.get(p.id())));
    }

    @SchemaMapping(typeName = "Enrollment", field = "nextLessonId")
    public UUID nextLessonId(Enrollment e) {
        return progress.nextLesson(e.pathId()).orElse(null);
    }

    @BatchMapping(typeName = "Module", field = "myProgress")
    public Map<Module, ModuleProgress> myProgress(List<Module> parents) {
        Map<UUID, ModuleProgress> byModule = progress.moduleProgressFor(parents);
        return parents.stream()
            .filter(m -> byModule.containsKey(m.id()))
            .collect(Collectors.toMap(Function.identity(), m -> byModule.get(m.id())));
    }

    @BatchMapping(typeName = "Lesson", field = "completed")
    public Map<Lesson, Boolean> completed(List<Lesson> parents) {
        Set<UUID> done = progress.completedLessonIds(parents);
        return parents.stream().collect(Collectors.toMap(Function.identity(), l -> done.contains(l.id())));
    }

    // ---------------------------------------------------------------- mutations

    @MutationMapping
    public Enrollment enroll(@Argument UUID pathId) {
        auth.require(Policies.LEARNER);
        return progress.enroll(pathId);
    }

    @MutationMapping
    public Enrollment dropPath(@Argument UUID pathId) {
        auth.require(Policies.LEARNER);
        return progress.drop(pathId);
    }

    @MutationMapping
    public ModuleProgress startModule(@Argument UUID moduleId) {
        auth.require(Policies.LEARNER);
        return progress.startModule(moduleId);
    }

    @MutationMapping
    public ModuleProgress dropModule(@Argument UUID moduleId) {
        auth.require(Policies.LEARNER);
        return progress.dropModule(moduleId);
    }

    @MutationMapping
    public Lesson completeLesson(@Argument UUID lessonId) {
        auth.require(Policies.LEARNER);
        return progress.completeLesson(lessonId);
    }

}

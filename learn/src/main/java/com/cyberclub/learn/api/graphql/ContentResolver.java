package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.inputs.LessonInput;
import com.cyberclub.learn.dtos.inputs.ModuleInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.LessonService;
import com.cyberclub.learn.services.ModuleService;

@Controller
public class ContentResolver {

    private final AuthService auth;
    private final ModuleService modules;
    private final LessonService lessons;

    public ContentResolver(AuthService auth, ModuleService modules, LessonService lessons) {
        this.auth = auth;
        this.modules = modules;
        this.lessons = lessons;
    }

    // ---------- queries ----------

    @QueryMapping
    public Lesson lesson(@Argument UUID id) {
        boolean drafts = Access.learnerSeesDrafts(auth);
        return lessons.byId(id, drafts);
    }

    @BatchMapping(typeName = "Module", field = "lessons")
    public Map<Module, List<Lesson>> lessons(List<Module> parents) {
        return lessons.forModules(parents);
    }

    // ---------- author mutations ----------

    @MutationMapping
    public Module upsertModule(@Argument ModuleInput input) {
        auth.require(Policies.CONTENT_AUTHOR);
        return modules.upsert(input);
    }

    @MutationMapping
    public Lesson upsertLesson(@Argument LessonInput input) {
        auth.require(Policies.CONTENT_AUTHOR);
        return lessons.upsert(input);
    }

    @MutationMapping
    public Module reorderLessons(@Argument UUID moduleId, @Argument List<UUID> orderedIds) {
        auth.require(Policies.CONTENT_AUTHOR);
        lessons.reorder(moduleId, orderedIds);
        return modules.byId(moduleId);
    }

    @MutationMapping
    public boolean deleteModule(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return modules.delete(id);
    }

    @MutationMapping
    public boolean deleteLesson(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return lessons.delete(id);
    }
}

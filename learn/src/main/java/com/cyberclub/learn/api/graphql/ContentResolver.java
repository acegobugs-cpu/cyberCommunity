package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import graphql.GraphQLContext;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonDoc;
import com.cyberclub.learn.dtos.inputs.LessonDocInput;
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
    public Lesson lesson(@Argument UUID id, GraphQLContext ctx) {
        boolean drafts = Access.learnerSeesDrafts(auth, ctx);
        return lessons.byId(id, drafts);
    }

    @BatchMapping(typeName = "Module", field = "lessons")
    public Map<Module, List<Lesson>> lessons(List<Module> parents) {
        return lessons.forModules(parents);
    }

    /** Document tree; parent lesson already passed visibility. */
    @BatchMapping(typeName = "Lesson", field = "docs")
    public Map<Lesson, List<LessonDoc>> docs(List<Lesson> parents) {
        return lessons.docsFor(parents);
    }

    // ---------- author mutations ----------

    @QueryMapping("modules")
    public List<Module> modulesList(@Argument String search, GraphQLContext ctx) {
        auth.require(Policies.CONTENT_AUTHOR);
        ctx.put(Access.DRAFTS, true);
        return modules.list(search);
    }

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
    public Lesson setLessonDocs(@Argument UUID lessonId, @Argument List<LessonDocInput> docs) {
        auth.require(Policies.CONTENT_AUTHOR);
        return lessons.setDocs(lessonId, docs);
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

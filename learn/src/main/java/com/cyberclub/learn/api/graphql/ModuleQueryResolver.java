package com.cyberclub.learn.api.graphql;

import com.cyberclub.learn.services.LessonService;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ReorderInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.ModuleService;

@Controller
public class ModuleQueryResolver {

    private final LessonService lessonService;
    private final AuthService auth;
    private final ModuleService moduleService;

    public ModuleQueryResolver(AuthService auth, ModuleService moduleService, LessonService lessonService){
        this.auth = auth;
        this.moduleService = moduleService;
        this.lessonService = lessonService;
    }

    @QueryMapping
    public List<Module> modules(){
        auth.require(Policies.LEARNER);
        return moduleService.getAllModules();
    }

    @QueryMapping
    public Module module(@Argument UUID id){
        auth.require(Policies.LEARNER);
        return moduleService.getModuleById(id);
    }

    @QueryMapping
    public List<Module> modulesByCourseId(@Argument UUID courseId){
        auth.require(Policies.LEARNER);
        return moduleService.getModulesByCourseId(courseId);
    }

    @QueryMapping
    public List<Module> modulesByCourseIds(@Argument List<UUID> courseIds){
        auth.require(Policies.LEARNER);
        return moduleService.getModulesByCourseIds(courseIds);
    }

    @BatchMapping(typeName = "Module", field = "lessons")
    public Map<Module, List<Lesson>> lessons(List<Module> modules) {
        auth.require(Policies.LEARNER);
        return lessonService.getLessonsForModules(modules);
    }

    @MutationMapping 
    public Module createModule(@Argument UUID courseId, @Argument String title, @Argument int position){
        auth.require(Policies.CONTENT_AUTHOR);
        return moduleService.createModule(courseId, title, position);
    }

    @MutationMapping
    public boolean reorderModules(@Argument UUID courseId, @Argument List<ReorderInput> items) {
        auth.require(Policies.CONTENT_AUTHOR);
        return moduleService.reorderModules(items);
    }
}

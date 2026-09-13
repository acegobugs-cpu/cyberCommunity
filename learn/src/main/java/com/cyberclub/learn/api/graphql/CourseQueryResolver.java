package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.CourseService;
import com.cyberclub.learn.services.ModuleService;

@Controller
public class CourseQueryResolver {

    private final ModuleService moduleService;
    private final AuthService auth;
    private final CourseService courseService;

    public CourseQueryResolver(AuthService auth, CourseService courseService, ModuleService moduleService) {
        this.auth = auth;
        this.courseService = courseService;
        this.moduleService = moduleService;
    }

    @QueryMapping 
    public List<Course> allCourses(){
        auth.require(Policies.LEARNER);
        return courseService.getAllCourses();
    }

    @QueryMapping 
    public Course courseById(@Argument UUID id){
        auth.require(Policies.LEARNER);
        return courseService.getCourseById(id);
    }

    @QueryMapping
    public List<Course> publishedCourses() {
        auth.require(Policies.LEARNER);
        return courseService.getPublishedCourses();
    }

    @QueryMapping
    public Course courseBySlug(@Argument String slug) {
        auth.require(Policies.LEARNER);
        return courseService.getCourseBySlug(slug, false);
    }

    @BatchMapping(typeName = "Course", field = "modules")
    public Map<Course, List<Module>> modules(List<Course> courses) {
        auth.require(Policies.LEARNER);
        return moduleService.getModulesForCourses(courses);
    }
    
    @MutationMapping
    public Course upsertCourse(@Argument Course input) {
        auth.require(Policies.CONTENT_AUTHOR);
        return courseService.upsertCourse(input);
    }

    @MutationMapping
    public Course publishCourse(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return courseService.publishCourse(id);
    }
}
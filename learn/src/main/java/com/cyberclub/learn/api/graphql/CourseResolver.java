package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.context.UserContext;
import com.cyberclub.learn.dtos.AuthResult;
import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.Difficulty;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.inputs.CourseInput;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.CourseService;
import com.cyberclub.learn.services.ModuleService;

@Controller
public class CourseResolver {

    private final AuthService auth;
    private final CourseService courses;
    private final ModuleService modules;

    public CourseResolver(AuthService auth, CourseService courses, ModuleService modules) {
        this.auth = auth;
        this.courses = courses;
        this.modules = modules;
    }

    // ---------- queries ----------

    /** Who am I in learn? Used by the frontend to gate authoring UI. */
    @QueryMapping
    public Me me() {
        AuthResult r = auth.require(Policies.LEARNER);
        return new Me(UserContext.getUserId(), r.role(), "ADMIN".equals(r.role()) || "AUTHOR".equals(r.role()));
    }

    public record Me(UUID userId, String role, boolean canAuthor) {}

    @QueryMapping
    public List<Course> courses(@Argument Difficulty difficulty, @Argument String tag, @Argument String search) {
        boolean drafts = Access.learnerSeesDrafts(auth);
        return courses.list(difficulty, tag, search, drafts);
    }

    @QueryMapping
    public Course course(@Argument String slug) {
        boolean drafts = Access.learnerSeesDrafts(auth);
        return courses.bySlug(slug, drafts);
    }

    @QueryMapping
    public Course courseById(@Argument UUID id) {
        boolean drafts = Access.learnerSeesDrafts(auth);
        return courses.byId(id, drafts);
    }

    /** Parent resolvers already authorized and filtered; no extra identity call here. */
    @BatchMapping(typeName = "Course", field = "modules")
    public Map<Course, List<Module>> modules(List<Course> parents) {
        return modules.forCourses(parents);
    }

    // ---------- author mutations ----------

    @MutationMapping
    public Course upsertCourse(@Argument CourseInput input) {
        auth.require(Policies.CONTENT_AUTHOR);
        return courses.upsert(input);
    }

    @MutationMapping
    public Course publishCourse(@Argument UUID id, @Argument Boolean published) {
        auth.require(Policies.CONTENT_AUTHOR);
        return courses.publish(id, published == null || published);
    }

    @MutationMapping
    public Course archiveCourse(@Argument UUID id) {
        auth.require(Policies.CONTENT_AUTHOR);
        return courses.archive(id);
    }

    @MutationMapping
    public Course reorderModules(@Argument UUID courseId, @Argument List<UUID> orderedIds) {
        auth.require(Policies.CONTENT_AUTHOR);
        modules.reorder(courseId, orderedIds);
        return courses.byId(courseId, true);
    }
}

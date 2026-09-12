package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;
import com.cyberclub.learn.security.Policies;

import com.cyberclub.learn.dtos.Course;
import com.cyberclub.learn.dtos.Lesson;
import com.cyberclub.learn.services.LessonService;
import com.cyberclub.learn.services.AuthService;

@Controller
public class LessonQueryResolver {
    
    private final AuthService auth;
    private final LessonService lessonService;

    public LessonQueryResolver(AuthService auth, LessonService lessonService){
        this.auth = auth;
        this.lessonService = lessonService;
    }

    @SchemaMapping(typeName = "Course", field = "lessons")
    public List<Lesson> lessons(Course course){
        auth.require(Policies.LEARNER);
        return lessonService.getLessonsForCourses(course.id());
    }

    @MutationMapping
    public Lesson createLesson(@Argument UUID courseId, @Argument String title, @Argument String content, @Argument int orderIndex){
        auth.require(Policies.CONTENT_AUTHOR);
        return lessonService.createLesson(courseId, title, content, orderIndex);
    }
}

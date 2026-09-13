package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;
import com.cyberclub.learn.dtos.domain.ReorderInput;
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

    @MutationMapping
    public Lesson createLesson(@Argument UUID moduleId, @Argument String title, @Argument LessonType lessonType, @Argument String contentMd, @Argument String videoUrl, @Argument int position, @Argument int estimatedMinutes){
        auth.require(Policies.CONTENT_AUTHOR);
        return lessonService.createLesson(moduleId, title, lessonType, contentMd, videoUrl, position, estimatedMinutes);
    }

    @MutationMapping
    public boolean reorderLessons(@Argument UUID moduleId, @Argument List<ReorderInput> items) {
        auth.require(Policies.CONTENT_AUTHOR);
        return lessonService.reorderLessons(items);
    }
}

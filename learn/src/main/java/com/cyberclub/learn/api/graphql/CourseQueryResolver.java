package com.cyberclub.learn.api.graphql;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.cyberclub.learn.dtos.Course;
import com.cyberclub.learn.security.Policies;
import com.cyberclub.learn.services.AuthService;
import com.cyberclub.learn.services.CourseService;

@Controller
public class CourseQueryResolver {

    private final AuthService auth;
    private final CourseService courseSerivce;

    public CourseQueryResolver(AuthService auth, CourseService courseSerivce){
        this.auth = auth;
        this.courseSerivce = courseSerivce;
    }

    @QueryMapping
    public List<Course> courses(){
        auth.require(Policies.MEMBER.or(Policies.AUTHOR).or(Policies.ADMIN));
        return courseSerivce.getCourses();
    }

    @QueryMapping
    public Course course(@Argument UUID id){
        auth.require(Policies.MEMBER.or(Policies.AUTHOR).or(Policies.ADMIN));
        return courseSerivce.getCourse(id);
    }

    @MutationMapping
    public Course createCourse(@Argument String title, @Argument String description){
        auth.require(Policies.AUTHOR.or(Policies.ADMIN));
        return courseSerivce.createCourse(title, description);
    }
    
}

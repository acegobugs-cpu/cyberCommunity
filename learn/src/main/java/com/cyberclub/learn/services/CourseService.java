package com.cyberclub.learn.services;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.dtos.Course;
import com.cyberclub.learn.repositories.CourseRepo;

@Service
public class CourseService {
    
    private final CourseRepo courseRepo;

    public CourseService(CourseRepo courseRepo){
        this.courseRepo = courseRepo;
    }

    public List<Course> getCourses(){
        return courseRepo.courses();
    }

    public Course getCourse(UUID id){
        return courseRepo.course(id).orElse(null);
    }

    @Transactional
    public Course createCourse(String title, String description){
        return courseRepo.save(title, description);
    }
}

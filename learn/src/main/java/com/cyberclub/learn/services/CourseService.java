package com.cyberclub.learn.services;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.repositories.CourseRepo;

@Service
public class CourseService {
    
    private final CourseRepo courseRepo;

    public CourseService(CourseRepo courseRepo){
        this.courseRepo = courseRepo;
    }

    public List<Course> getAllCourses(){
        return courseRepo.findAllCourses();
    }

    public List<Course> getPublishedCourses(){
        return courseRepo.findPublishedCourses();
    }

    public Course getCourseById(UUID id){
        return courseRepo.findById(id).orElse(null);
    }

    public Course getCourseBySlug(String slug, boolean includeUnpublished){
        return courseRepo.findBySlug(slug, includeUnpublished).orElse(null);
    }

    @Transactional
    public Course createCourse(Course course){
        return courseRepo.save(course);
    }

    @Transactional
    public Course upsertCourse(Course course){
        return courseRepo.save(course);
    }

    @Transactional 
    public Course publishCourse(UUID id){
        Course course = courseRepo.findById(id).orElse(null);
        if (course == null){
            return null;
        }
        return courseRepo.setStatus(id, "PUBLISHED");
    }
}

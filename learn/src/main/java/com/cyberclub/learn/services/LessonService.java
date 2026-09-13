package com.cyberclub.learn.services;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.dtos.domain.Lesson;
import com.cyberclub.learn.dtos.domain.LessonType;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ReorderInput;
import com.cyberclub.learn.repositories.LessonRepo;

@Service
public class LessonService {
    
    private final LessonRepo lessonRepo;

    public LessonService(LessonRepo lessonRepo){
        this.lessonRepo = lessonRepo;
    }

    public List<Lesson> allLessons(){
        return lessonRepo.findAll();
    }

    public Lesson getLessonById(UUID id){
        // Assuming you have a method in LessonRepo to find a lesson by its ID
        return lessonRepo.findById(id);
    }

    public Lesson getLessonByModuleID(UUID id){
        return lessonRepo.findByModuleId(id);
    }

    public List<Lesson> getLessonsByModuleIds(List<UUID> moduleIds){
        return lessonRepo.findByModuleIds(moduleIds);
    }

    public Map<Module, List<Lesson>> getLessonsForModules(List<Module> modules){

        List<UUID> moduleIds = modules.stream().map(Module::id).toList();

        List<Lesson> allLessons = lessonRepo.findByModuleIds(moduleIds);

        Map<UUID, List<Lesson>> lessonsByModuleId = allLessons.stream()
                .collect(Collectors.groupingBy(Lesson::moduleId));

        return modules.stream()
                .collect(Collectors.toMap(
                    module -> module,
                    module -> lessonsByModuleId.getOrDefault(module.id(), List.of())
                ));
    }

    public Lesson createLesson(UUID moduleId, String title, LessonType lessonType, String contentMd, String videoUrl, int position, int estimatedMinutes){
        return lessonRepo.save(moduleId, title, lessonType, contentMd, videoUrl, position, estimatedMinutes);
    }

    @Transactional
    public boolean reorderLessons(List<ReorderInput> items) {
        if (items == null || items.isEmpty()) {
            return false;
        }
        lessonRepo.updatePosition(items);
        return true;
    }
}

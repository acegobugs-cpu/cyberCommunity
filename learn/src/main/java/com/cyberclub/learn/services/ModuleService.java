package com.cyberclub.learn.services;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.cyberclub.learn.dtos.domain.Course;
import com.cyberclub.learn.dtos.domain.Module;
import com.cyberclub.learn.dtos.domain.ReorderInput;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.learn.repositories.ModuleRepo;

@Service 
public class ModuleService {
    private final ModuleRepo moduleRepo;

    public ModuleService(ModuleRepo moduleRepo) {
        this.moduleRepo = moduleRepo;
    }

    public List<Module> getAllModules(){
        return moduleRepo.findAllModules();
    }
    
    public Module getModuleById(UUID id){
        return moduleRepo.findModuleById(id);
    }

    public List<Module> getModulesByCourseId(UUID courseId){
        return moduleRepo.findByCourseId(courseId);
    }

    public List<Module> getModulesByCourseIds(List<UUID> courseIds){
        return moduleRepo.findByCourseIds(courseIds);
    }

    public Map<Course, List<Module>> getModulesForCourses(List<Course> courses) {
        // 1. Extract just the UUIDs to send to SQL
        List<UUID> courseIds = courses.stream().map(Course::id).toList();

        // 2. Fetch all modules in ONE single DB query
        List<Module> allModules = moduleRepo.findByCourseIds(courseIds);

        // 3. Group modules by their courseId
        Map<UUID, List<Module>> modulesByCourseId = allModules.stream()
                .collect(Collectors.groupingBy(Module::courseId));

        // 4. Build the Map<Course, List<Module>> key-value mapping Spring GraphQL expects
        return courses.stream()
                .collect(Collectors.toMap(
                    course -> course,
                    course -> modulesByCourseId.getOrDefault(course.id(), List.of())
                ));
    }

    public Module createModule(UUID courseId, String title, int position){
        return moduleRepo.save(courseId, title, position);
    }

    @Transactional
    public boolean reorderModules(List<ReorderInput> items) {
        if (items == null || items.isEmpty()) {
            return false;
        }
        moduleRepo.updatePosition(items);
        return true;
    }
}

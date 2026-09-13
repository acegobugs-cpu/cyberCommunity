package com.cyberclub.learn.dtos.inputs;

import java.util.UUID;

import com.cyberclub.learn.dtos.domain.LessonType;

public record LessonInput(
    UUID id,
    UUID moduleId,
    String title,
    LessonType type,
    String contentMd,
    String videoUrl,
    Integer estimatedMinutes,
    Integer position
) {}

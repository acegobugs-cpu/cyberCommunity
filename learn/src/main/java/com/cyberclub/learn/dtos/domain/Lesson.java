package com.cyberclub.learn.dtos.domain;

import java.util.UUID;
import java.time.Instant;

public record Lesson(
    UUID id,
    UUID moduleId,

    String title,
    LessonType type,
    String contentMd,
    String videoUrl,
    
    int position,
    int estimatedMinutes,

    Instant createdAt,
    Instant updatedAt

) {
}
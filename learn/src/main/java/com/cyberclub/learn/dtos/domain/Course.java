package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.UUID;


public record Course(
    UUID id,
    
    String title,
    String slug,
    String description,
    Object tag,
    
    Difficulty difficulty,
    CourseStatus status,

    int estimatedMinutes,

    UUID createdBy,

    Instant createdAt,
    Instant updatedAt,
    Instant archivedAt
) {}

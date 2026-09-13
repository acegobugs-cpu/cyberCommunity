package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Course(
    UUID id,
    String slug,
    String title,
    String description,
    Difficulty difficulty,
    List<String> tags,
    CourseStatus status,
    int estimatedMinutes,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt,
    Instant archivedAt
) {}

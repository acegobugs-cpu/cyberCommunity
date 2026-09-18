package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Path(
    UUID id,
    String slug,
    String title,
    String description,
    Difficulty difficulty,
    List<String> tags,
    PathStatus status,
    int estimatedMinutes,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt,
    Instant archivedAt
) {}

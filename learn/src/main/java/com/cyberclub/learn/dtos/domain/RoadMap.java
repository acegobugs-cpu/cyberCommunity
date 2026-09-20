package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.UUID;

public record RoadMap(
    UUID id,
    String slug,
    String title,
    String descriptionMd,
    RoadMapStatus status,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt,
    Instant archivedAt
) {
}

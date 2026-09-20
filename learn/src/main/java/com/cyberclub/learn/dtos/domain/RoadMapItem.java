package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.UUID;

public record RoadMapItem(
    UUID id,
    UUID roadmapId,
    UUID pathId,
    UUID moduleId,
    int position,
    GroupType groupType,
    boolean isRequired,
    Instant createdAt
) {
}

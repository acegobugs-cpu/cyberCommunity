package com.cyberclub.learn.dtos.domain;

import java.util.UUID;
import java.time.Instant;
public record Module(
    UUID id,
    UUID pathId,

    String title,
    String descriptionMd,
    
    int position,

    Instant createdAt,
    Instant updatedAt
) {
    
}

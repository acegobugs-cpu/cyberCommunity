package com.cyberclub.learn.dtos.domain;

import java.util.UUID;
import java.time.Instant;
public record Module(
    UUID id,
    UUID courseId,

    String title,
    String descriptionMd,
    
    int position,

    Instant createdAt,
    Instant updatedAt
) {
    
}

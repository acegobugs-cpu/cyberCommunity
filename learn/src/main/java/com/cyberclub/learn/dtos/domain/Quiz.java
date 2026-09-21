package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.UUID;

public record Quiz(
    UUID id,
    UUID lessonId,
    int passScore,
    boolean shuffle,
    Instant createdAt,
    Instant updatedAt
) {}

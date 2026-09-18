package com.cyberclub.learn.dtos.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record Enrollment(
    UUID userId,
    UUID pathId,
    EnrollmentStatus status,
    BigDecimal progress,
    Instant enrolledAt,
    Instant completedAt,
    Instant droppedAt
) {}

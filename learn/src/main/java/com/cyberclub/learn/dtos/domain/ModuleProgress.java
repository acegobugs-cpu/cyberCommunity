package com.cyberclub.learn.dtos.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ModuleProgress(
    UUID userId,
    UUID moduleId,
    ModuleProgressStatus status,
    BigDecimal progress,
    Instant startedAt,
    Instant completedAt
) {}

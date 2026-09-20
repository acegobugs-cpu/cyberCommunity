package com.cyberclub.learn.dtos.domain;

import java.util.UUID;
import java.time.Instant;

/** Reusable content unit. Which paths include it, and where, lives in path_modules. */
public record Module(
    UUID id,
    String title,
    String descriptionMd,
    Instant createdAt,
    Instant updatedAt
) {}

package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.UUID;

/** One node of a lesson's document tree; folders are implicit from the slash-separated path. */
public record LessonDoc(
    UUID id,
    UUID lessonId,
    String path,
    LessonDocKind kind,
    String title,
    String contentMd,
    String videoUrl,
    int position,
    Instant updatedAt
) {}

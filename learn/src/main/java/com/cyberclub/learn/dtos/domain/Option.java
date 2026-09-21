package com.cyberclub.learn.dtos.domain;

import java.util.UUID;

/** {@code correct} is loaded for grading and authors; the resolver nulls it for learners. */
public record Option(
    UUID id,
    UUID questionId,
    int position,
    String textMd,
    boolean correct
) {}

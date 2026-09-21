package com.cyberclub.learn.dtos.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** One graded submission. {@code answers} = questionId → chosen optionIds; {@code results} derived at read time. */
public record QuizAttempt(
    UUID id,
    UUID quizId,
    UUID userId,
    Map<UUID, List<UUID>> answers,
    int score,
    boolean passed,
    Instant submittedAt
) {}

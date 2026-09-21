package com.cyberclub.learn.dtos.domain;

import java.util.UUID;

public record Question(
    UUID id,
    UUID quizId,
    int position,
    String promptMd,
    QuestionKind kind,
    int points
) {}

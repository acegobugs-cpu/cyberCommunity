package com.cyberclub.learn.dtos.domain;

import java.util.UUID;

public record QuestionResult(UUID questionId, boolean correct, int pointsEarned, int points) {}

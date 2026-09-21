package com.cyberclub.learn.dtos.inputs;

import java.util.List;
import java.util.UUID;

public record QuizInput(UUID lessonId, Integer passScore, Boolean shuffle, List<QuestionInput> questions) {}

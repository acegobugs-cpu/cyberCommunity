package com.cyberclub.learn.dtos.inputs;

import com.cyberclub.learn.dtos.domain.LessonDocKind;

public record LessonDocInput(String path, LessonDocKind kind, String title, String contentMd, String videoUrl) {}

package com.cyberclub.learn.dtos.inputs;

import java.util.List;
import java.util.UUID;

import com.cyberclub.learn.dtos.domain.Difficulty;

public record CourseInput(
    UUID id,
    String title,
    String slug,
    String description,
    Difficulty difficulty,
    List<String> tags
) {}

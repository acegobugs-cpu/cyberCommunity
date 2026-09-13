package com.cyberclub.learn.dtos.inputs;

import java.util.UUID;

public record ModuleInput(
    UUID id,
    UUID courseId,
    String title,
    String descriptionMd,
    Integer position
) {}

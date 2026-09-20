package com.cyberclub.learn.dtos.inputs;

import java.util.UUID;

/** {@code pathId} is only used on create: the new module is appended to that path. */
public record ModuleInput(
    UUID id,
    UUID pathId,
    String title,
    String descriptionMd
) {}

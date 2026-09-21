package com.cyberclub.learn.dtos.inputs;

import java.util.List;
import java.util.UUID;

public record AnswerInput(UUID questionId, List<UUID> optionIds) {}

package com.cyberclub.learn.dtos.inputs;

import java.util.List;

import com.cyberclub.learn.dtos.domain.QuestionKind;

public record QuestionInput(String promptMd, QuestionKind kind, Integer points, List<OptionInput> options) {}

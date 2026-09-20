package com.cyberclub.learn.dtos.inputs;

import java.util.UUID;

import com.cyberclub.learn.dtos.domain.GroupType;

/** Exactly one of pathId / moduleId. Items sharing a position form one step. */
public record RoadMapItemInput(
    int position,
    GroupType groupType,
    Boolean isRequired,
    UUID pathId,
    UUID moduleId
) {}

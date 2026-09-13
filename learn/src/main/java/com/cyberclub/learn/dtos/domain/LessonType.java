package com.cyberclub.learn.dtos.domain;

/** Matches the CHECK constraint on learn.lessons.type. EXERCISE is reserved for Plan 02 and not exposed in GraphQL. */
public enum LessonType {
    READING,
    VIDEO,
    QUIZ,
    LAB,
    PROJECT,
    EXERCISE
}

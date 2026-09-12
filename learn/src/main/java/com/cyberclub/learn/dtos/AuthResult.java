package com.cyberclub.learn.dtos;

public record AuthResult(
    boolean allowed,
    String role
) {}

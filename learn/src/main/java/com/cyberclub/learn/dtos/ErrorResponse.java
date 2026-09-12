package com.cyberclub.learn.dtos;

import java.time.Instant;

public record ErrorResponse(
    String  error,
    String  message,
    String  path,
    String  correlationId,
    Instant timestamp
) {}

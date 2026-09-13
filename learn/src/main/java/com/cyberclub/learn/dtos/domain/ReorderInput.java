package com.cyberclub.learn.dtos.domain;

import java.util.UUID;

public record ReorderInput(
    UUID id,
    int position
) {
    
}

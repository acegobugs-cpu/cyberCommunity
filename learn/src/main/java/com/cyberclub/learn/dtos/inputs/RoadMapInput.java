package com.cyberclub.learn.dtos.inputs;

import java.util.UUID;

/** id absent → insert (slug generated from title when omitted); id present → update. */
public record RoadMapInput(
    UUID id,
    String title,
    String slug,
    String descriptionMd
) {}

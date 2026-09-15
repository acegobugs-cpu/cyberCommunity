package com.cyberclub.identity.api.dtos;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Public view of a user (no credentials) plus their role per service. */
public record UserRecord(
    UUID id,
    String username,
    String email,
    Instant createdAt,
    /** serviceName → role (a user has at most one membership per service). */
    Map<String, String> memberships
) {
    public UserRecord(UUID id, String username, String email, Instant createdAt) {
        this(id, username, email, createdAt, Map.of());
    }

    public UserRecord withMemberships(Map<String, String> memberships) {
        return new UserRecord(id, username, email, createdAt, memberships);
    }
}

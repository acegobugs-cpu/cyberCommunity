package com.cyberclub.identity.repository;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.cyberclub.identity.api.dtos.IsMemberResponse;

@Repository
public class MembershipRepo {

    private static final String DEFAULT_ROLE = "USER";

    private final JdbcTemplate jdbc;

    public MembershipRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Idempotent join: creates a USER membership if none exists and returns the
     * (possibly pre-existing) role. Empty when the service does not exist.
     */
    public Optional<String> join(UUID userId, String serviceName) {
        jdbc.update("""
            INSERT INTO identity.memberships (id, user_id, service_id, role)
            SELECT ?, ?, s.id, ?
            FROM identity.services s
            WHERE s.service_name = ?
            ON CONFLICT (user_id, service_id) DO NOTHING
            """, UUID.randomUUID(), userId, DEFAULT_ROLE, serviceName);
        return findRole(userId, serviceName);
    }

    public Optional<String> findRole(UUID userId, String serviceName) {
        return jdbc.query("""
            SELECT m.role FROM identity.memberships m
            JOIN identity.services s ON m.service_id = s.id
            WHERE m.user_id = ? AND s.service_name = ?
            """, (rs, i) -> rs.getString("role"), userId, serviceName).stream().findFirst();
    }

    /** serviceName → role for every service the user has joined. */
    public Map<String, String> findMemberships(UUID userId) {
        Map<String, String> out = new LinkedHashMap<>();
        jdbc.query("""
            SELECT s.service_name, m.role
            FROM identity.memberships m
            JOIN identity.services s ON m.service_id = s.id
            WHERE m.user_id = ?
            ORDER BY s.service_name
            """, rs -> { out.put(rs.getString("service_name"), rs.getString("role")); }, userId);
        return out;
    }

    public Optional<IsMemberResponse> findMembership(UUID userId, String serviceName) {
        return findRole(userId, serviceName).map(role -> new IsMemberResponse(true, role));
    }

    public boolean serviceExists(String serviceName) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM identity.services WHERE service_name = ?", Integer.class, serviceName);
        return n != null && n > 0;
    }
}

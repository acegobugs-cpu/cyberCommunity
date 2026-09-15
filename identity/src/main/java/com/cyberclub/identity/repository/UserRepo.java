package com.cyberclub.identity.repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import com.cyberclub.identity.api.dtos.MemberRecord;
import com.cyberclub.identity.api.dtos.User;
import com.cyberclub.identity.api.dtos.UserRecord;

@Repository
public class UserRepo {

    private static final String MEMBER_SQL = """
        SELECT s.service_name, u.username, u.email, m.role, m.created_at
        FROM identity.memberships m
        JOIN identity.users u ON m.user_id = u.id
        JOIN identity.services s ON m.service_id = s.id
        WHERE s.service_name = ?
        """;

    private static final RowMapper<User> USER = (rs, i) -> new User(
        rs.getObject("id", UUID.class),
        rs.getString("username"),
        rs.getString("email"),
        rs.getString("password"),
        rs.getTimestamp("created_at").toInstant()
    );

    private static final RowMapper<UserRecord> RECORD = (rs, i) -> new UserRecord(
        rs.getObject("id", UUID.class),
        rs.getString("username"),
        rs.getString("email"),
        rs.getTimestamp("created_at").toInstant()
    );

    private static final RowMapper<MemberRecord> MEMBER = (rs, i) -> new MemberRecord(
        rs.getString("service_name"),
        rs.getString("username"),
        rs.getString("email"),
        rs.getString("role"),
        rs.getTimestamp("created_at").toLocalDateTime()
    );

    private final JdbcTemplate jdbc;

    public UserRepo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UserRecord save(User user) {
        return jdbc.queryForObject("""
            INSERT INTO identity.users (id, email, username, password, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, username, email, created_at
            """, RECORD, user.id(), user.email(), user.username(), user.password(), Timestamp.from(user.createdAt()));
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.query("SELECT id, username, email, password, created_at FROM identity.users WHERE email = ?", USER, email)
            .stream().findFirst();
    }

    public boolean existsByEmail(String email) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM identity.users WHERE email = ?", Integer.class, email);
        return n != null && n > 0;
    }

    public Optional<UserRecord> findById(UUID id) {
        return jdbc.query("SELECT id, username, email, created_at FROM identity.users WHERE id = ?", RECORD, id)
            .stream().findFirst();
    }

    public List<UserRecord> allUsers() {
        return jdbc.query("SELECT id, username, email, created_at FROM identity.users", RECORD);
    }

    /** All members of a service. */
    public List<MemberRecord> findMembers(String serviceName) {
        return jdbc.query(MEMBER_SQL, MEMBER, serviceName);
    }

    /** One member of a service; empty when the user is not a member. */
    public Optional<MemberRecord> findMember(String serviceName, UUID userId) {
        return jdbc.query(MEMBER_SQL + " AND u.id = ?", MEMBER, serviceName, userId).stream().findFirst();
    }
}

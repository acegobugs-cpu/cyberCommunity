package com.cyberclub.identity.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.cyberclub.identity.BaseIntegrationTest;
import com.cyberclub.identity.api.dtos.UserRecord;
import com.cyberclub.identity.exceptions.ConflictException;
import com.cyberclub.identity.exceptions.NotFoundException;
import com.cyberclub.identity.repository.UserRepo;
import com.cyberclub.identity.services.AuthService;

class UserRegTest extends BaseIntegrationTest {

    @Autowired
    AuthService service;

    @Autowired
    UserRepo userRepo;

    @Test
    void registers_user_with_hashed_password() {
        UserRecord user = service.register("Test User", "hash@example.com", "password123", "portal");

        String stored = userRepo.findByEmail("hash@example.com").orElseThrow().password();
        assertThat(user.email()).isEqualTo("hash@example.com");
        assertThat(stored).isNotEqualTo("password123").startsWith("$2"); // bcrypt marker
    }

    @Test
    void rejects_duplicate_email() {
        service.register("A", "dup@example.com", "pass", "portal");

        assertThrows(ConflictException.class, () ->
            service.register("B", "dup@example.com", "pass", "portal")
        );
    }

    @Test
    void signup_joins_only_the_target_service() {
        UserRecord user = service.register("Learner", "learner@example.com", "pass", "learn");

        assertThat(user.memberships()).containsExactly(java.util.Map.entry("learn", "USER"));
    }

    @Test
    void join_service_is_explicit_and_idempotent() {
        UserRecord user = service.register("Joiner", "joiner@example.com", "pass", "portal");

        UserRecord afterJoin = service.joinService(user.id(), "learn");
        UserRecord afterSecondJoin = service.joinService(user.id(), "learn");

        assertThat(afterJoin.memberships()).containsOnlyKeys("portal", "learn");
        assertThat(afterSecondJoin.memberships()).isEqualTo(afterJoin.memberships());
    }

    @Test
    void join_rejects_unknown_service_and_user() {
        UserRecord user = service.register("X", "x@example.com", "pass", "portal");

        assertThrows(NotFoundException.class, () -> service.joinService(user.id(), "nope"));
        assertThrows(NotFoundException.class, () -> service.joinService(UUID.randomUUID(), "learn"));
    }
}

package com.cyberclub.identity.user;

import com.cyberclub.identity.BaseIntegrationTest;
import com.cyberclub.identity.api.dtos.User;
import com.cyberclub.identity.exceptions.ConflictException;
import com.cyberclub.identity.repository.UserRepo;
import com.cyberclub.identity.services.UserRegService;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.*;

class UserRegTest extends BaseIntegrationTest {


    @Autowired
    UserRegService service;

    @Autowired
    UserRepo userRepo;

    @Test
    void registers_user_with_hashed_password() {
        User user = service.register(
            "test@example.com",
            "Test User",
            "password123"
        );

        assertThat(user.password())
            .isNotEqualTo("password123")
            .startsWith("$2"); // bcrypt marker
    }

    @Test
    void rejects_duplicate_email() {
        service.register("A", "dup@example.com", "pass");

        assertThrows(ConflictException.class, () ->
            service.register("B", "dup@example.com", "pass")
        );
    }
}

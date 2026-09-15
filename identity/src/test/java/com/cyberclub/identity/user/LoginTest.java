package com.cyberclub.identity.user;

import com.cyberclub.identity.BaseIntegrationTest;
import com.cyberclub.identity.services.AuthService;
import com.cyberclub.identity.exceptions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.*;

class LoginTest extends BaseIntegrationTest {

    @Autowired
    AuthService registrationService;

    @Test
    void authenticates_with_correct_password() {
        registrationService.register(
            "login",
            "Login@example.com",
            "secret",
            "portal"
        );

        assertThatCode(() ->
            registrationService.authenticate("Login@example.com", "secret")
        ).doesNotThrowAnyException();
    }

    @Test
    void rejects_wrong_password() {
        registrationService.register(
            "badpass@test.com",
            "User",
            "correct",
            "learn"
        );

        assertThatThrownBy(() ->
            registrationService.authenticate("badpass@test.com", "wrong")
        ).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void rejects_unknown_email() {
        assertThatThrownBy(() ->
            registrationService.authenticate("unknown@test.com", "any")
        ).isInstanceOf(UnauthorizedException.class);
    }
}

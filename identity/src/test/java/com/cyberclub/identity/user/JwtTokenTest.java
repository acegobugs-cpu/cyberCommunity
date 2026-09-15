package com.cyberclub.identity.user;

import com.cyberclub.identity.api.dtos.User;
import com.cyberclub.identity.api.dtos.UserRecord;
import com.cyberclub.identity.services.JwtTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class JwtTokenTest {

    @Test
    void generates_valid_jwt() {
        JwtTokenService service =
            TestJwtFactory.createTokenService();

        User user = new User(
            UUID.randomUUID(),
            "JWT User",
            "jwt@test.com",
            "hash",
            Instant.now()
        );

        String token = service.generate(new UserRecord(user.id(), user.username(), user.email(), null, null));

        Claims claims = Jwts.parserBuilder()
            .setSigningKey(TestJwtFactory.key())
            .build()
            .parseClaimsJws(token)
            .getBody();

        assertThat(claims.getSubject())
            .isEqualTo(user.id().toString());

        assertThat(claims.get("email"))
            .isEqualTo("jwt@test.com");
    }
}

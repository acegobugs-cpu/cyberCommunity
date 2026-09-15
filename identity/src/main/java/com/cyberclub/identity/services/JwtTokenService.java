package com.cyberclub.identity.services;

import com.cyberclub.identity.config.JwtProperties;
import com.cyberclub.identity.api.dtos.UserRecord;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtTokenService {

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtTokenService(JwtProperties properties) {
        this.properties = properties;

        if (properties.secret() == null || properties.secret().length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        }

        this.key = Keys.hmacShaKeyFor(
            properties.secret().getBytes(StandardCharsets.UTF_8)
        );
    }

    

    public String generate(UserRecord user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.expiration());

        return Jwts.builder()
            .setSubject(user.id().toString())
            .setIssuer("identity-service")
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(expiry))
            .claim("email", user.email())
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }
}

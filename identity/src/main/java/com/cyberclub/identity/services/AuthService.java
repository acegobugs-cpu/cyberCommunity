package com.cyberclub.identity.services;

import java.time.Instant;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cyberclub.identity.api.dtos.User;
import com.cyberclub.identity.api.dtos.UserRecord;
import com.cyberclub.identity.exceptions.ConflictException;
import com.cyberclub.identity.exceptions.NotFoundException;
import com.cyberclub.identity.exceptions.UnauthorizedException;
import com.cyberclub.identity.repository.MembershipRepo;
import com.cyberclub.identity.repository.UserRepo;

/**
 * Accounts and memberships. An account is one email; membership in a service
 * is explicit — granted for the service the user signs up on, and for any
 * other service via {@link #joinService}.
 */
@Service
public class AuthService {

    private final UserRepo users;
    private final MembershipRepo memberships;
    private final PasswordEncoder encoder;

    public AuthService(UserRepo users, MembershipRepo memberships, PasswordEncoder encoder) {
        this.users = users;
        this.memberships = memberships;
        this.encoder = encoder;
    }

    @Transactional
    public UserRecord register(String username, String email, String password, String serviceName) {
        requireService(serviceName);
        if (users.existsByEmail(email)) {
            throw new ConflictException("email already in use");
        }
        User user = new User(UUID.randomUUID(), username, email, encoder.encode(password), Instant.now());
        UserRecord saved;
        try {
            saved = users.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("email already in use");
        }
        memberships.join(saved.id(), serviceName);
        return saved.withMemberships(memberships.findMemberships(saved.id()));
    }

    public UserRecord authenticate(String email, String password) {
        User user = users.findByEmail(email)
            .filter(u -> encoder.matches(password, u.password()))
            .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        return new UserRecord(user.id(), user.username(), user.email(), user.createdAt(),
            memberships.findMemberships(user.id()));
    }

    /** Idempotent: joining a service you already belong to returns the current state. */
    @Transactional
    public UserRecord joinService(UUID userId, String serviceName) {
        requireService(serviceName);
        UserRecord user = users.findById(userId)
            .orElseThrow(() -> new NotFoundException("user not found"));
        memberships.join(userId, serviceName);
        return user.withMemberships(memberships.findMemberships(userId));
    }

    private void requireService(String serviceName) {
        if (!memberships.serviceExists(serviceName)) {
            throw new NotFoundException("unknown service: " + serviceName);
        }
    }
}

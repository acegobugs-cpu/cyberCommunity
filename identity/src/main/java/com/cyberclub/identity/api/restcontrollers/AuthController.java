package com.cyberclub.identity.api.restcontrollers;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cyberclub.identity.api.dtos.UserLoginRequest;
import com.cyberclub.identity.api.dtos.UserRecord;
import com.cyberclub.identity.api.dtos.UserRegRequest;
import com.cyberclub.identity.api.dtos.UserResponse;
import com.cyberclub.identity.config.JwtProperties;
import com.cyberclub.identity.exceptions.UnauthorizedException;
import com.cyberclub.identity.services.AuthService;
import com.cyberclub.identity.services.JwtTokenService;

import jakarta.validation.Valid;

/**
 * Public auth API (reached through the gateway).
 *
 *   POST /api/auth/signup?service=learn   create account + join that service → token
 *   POST /api/auth/signin                 verify credentials → token (no membership change)
 *   POST /api/memberships/{service}       join a service with the current account → fresh token
 *
 * The gateway sets X-User-Id only for a valid JWT, so on the join endpoint the
 * header is the authenticated caller.
 */
@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService auth;
    private final JwtTokenService tokens;
    private final JwtProperties jwt;

    public AuthController(AuthService auth, JwtTokenService tokens, JwtProperties jwt) {
        this.auth = auth;
        this.tokens = tokens;
        this.jwt = jwt;
    }

    @PostMapping("/auth/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse signup(@RequestBody @Valid UserRegRequest req,
                               @RequestParam(defaultValue = "portal") String service) {
        UserRecord user = auth.register(req.username(), req.email(), req.password(), service);
        return issue(user);
    }

    @PostMapping("/auth/signin")
    public UserResponse signin(@RequestBody @Valid UserLoginRequest req) {
        return issue(auth.authenticate(req.email(), req.password()));
    }

    @PostMapping("/memberships/{service}")
    public UserResponse join(@PathVariable String service,
                             @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return issue(auth.joinService(parseUserId(userId), service));
    }

    private UserResponse issue(UserRecord user) {
        return new UserResponse(tokens.generate(user), jwt.expiration());
    }

    private static UUID parseUserId(String header) {
        if (header == null || header.isBlank()) {
            throw new UnauthorizedException("authentication required");
        }
        try {
            return UUID.fromString(header);
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("invalid user id");
        }
    }
}

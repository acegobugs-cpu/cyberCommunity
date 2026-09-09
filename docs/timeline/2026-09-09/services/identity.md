# Identity Service — 2026-09-09

**Path:** `identity/` · **Main class:** `com.cyberclub.identity.IdentityServiceApplication` · **Status:** functional (email/password only)

## Purpose

Owns users, per-service memberships and JWT issuance. Exposes two public-facing endpoints (via the gateway) and three internal lookup endpoints used by other services.

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 21 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-security-core`, `postgresql`, `flyway-core` + `flyway-database-postgresql` 11.19.0 (present but `spring.flyway.enabled=false`), `spring-boot-devtools`, `hibernate-validator`, `jakarta.validation-api 3.0.2`, `jjwt 0.11.5`; test: `spring-boot-starter-test`, `testcontainers postgresql/junit-jupiter 1.19.0` |
| Port | `8082` locally (`server.port=8082`); docker profile leaves `server.port=` empty → 8080 |
| Dockerfile | `maven:3.9.5-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`, `EXPOSE 8080`, `java -jar identity.jar` |

## Configuration (`application.properties`; docker profile identical except empty `server.port`)

| Key | Value |
| :-- | :-- |
| `server.port` | `8082` |
| `spring.datasource.url/username/password` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}` |
| `spring.datasource.driver-class-name` | `org.postgresql.Driver` |
| `security.jwt.secret` | `${JWT_SECRET}` |
| `security.jwt.expiration` | `900` (seconds) |
| `spring.jpa.properties.hibernate.default_schema` | `identity` |
| `spring.jpa.hibernate.ddl-auto` | `none` |
| `spring.flyway.enabled`, `spring.liquibase.enabled` | `false` |
| `spring.jpa.database-platform` | `org.hibernate.dialect.PostgreSQLDialect` |

Env read directly: `INTERNAL_GATEWAY_SECRET` (`InternalAuthFilter`).

Note: all repository SQL fully qualifies tables as `identity.<table>`; there is no `search_path` wrapper here (unlike portal/learn).

## Package map

```
com.cyberclub.identity
├── IdentityServiceApplication
├── api/dtos/        User, UserRecord, UserRegRequest, UserLoginRequest, UserResponse,
│                    ServiceRecord, MemberRecord, IsMemberResponse
├── api/restcontrollers/UserRegController            # /signup, /signin
├── api/internalcontrollers/InternalController       # /private/api/{serviceName}/{id}
│                          InternalUserController    # /private/api/{serviceName}/members
│                          InternalMemberController  # /private/api/member/check
├── config/SecurityConfig, InternalAuthConfig, JwtConfig, JwtProperties
├── exceptions/UnauthorizedException
├── filters/InternalAuthFilter
├── repository/UserRepo, MembershipRepo, ServiceRepo   # JdbcTemplate
└── services/UserRegService, MembershipService, JwtTokenService
```

## Security chain

1. **`InternalAuthFilter`** — registered via `InternalAuthConfig` at `Ordered.HIGHEST_PRECEDENCE`. Reads `X-Internal-Auth`; compares with `INTERNAL_GATEWAY_SECRET` using `MessageDigest.isEqual`. On mismatch/missing → `401`, `application/json`:
   ```json
   {"error": "unauthorized", "message": "Gateway validation is required"}
   ```
   Applies to **every** path including `/signup` and `/signin` — identity is unreachable except through the gateway.
2. **`SecurityConfig`** — Spring Security with CSRF disabled and `anyRequest().permitAll()`; defines `BCryptPasswordEncoder(12)`.

## Endpoints

All require `X-Internal-Auth`.

### `POST /signup` → 201
Request `UserRegRequest { username, email, password }` (annotated `@Valid` but no field constraints).
Flow: `UserRegService.register` → `MembershipService.saveMembership(userId)` → `JwtTokenService.generate`.
Response `UserResponse { accessToken, tokenType: "Bearer", expiresIn: 900 }`.
Duplicate email → `IllegalStateException("email already in use")` → **500** (no handler).

### `POST /signin` → 200
Request `UserLoginRequest { email, password }`.
`UserRegService.authenticate` → `JwtTokenService.generate` → `UserResponse`.
Wrong email/password → `UnauthorizedException("Invalid credentials")` → **500** (no handler maps it to 401).

### `GET /private/api/{serviceName}/{id}`
Returns `{ "service": ServiceRecord{id, service_name, created_at}, "user": UserRecord{id, username, email, created_at} }`.
`400` if `id` is not a UUID; `404` if service or user is missing.

### `GET /private/api/{serviceName}/members` → 200
Returns `List<MemberRecord{service_name, username, email, role, created_at}>` for the named service (may be empty).

### `GET /private/api/member/check?userId=<uuid>&serviceName=<name>`
| Case | Status | Body |
| :-- | :-- | :-- |
| service unknown | 404 | — |
| membership exists | 200 | `IsMemberResponse{allowed:true, role}` |
| no membership | 403 | `IsMemberResponse{allowed:false, role:null}` |

## Services

### `JwtTokenService`
- Constructor enforces `JWT_SECRET.length() >= 32` (`IllegalStateException` otherwise); HMAC-SHA256 key.
- `generate(User)` → JWS with `sub`=user id, `iss`=`identity-service`, `iat`, `exp`=now+`expiration`, claim `email`.

### `UserRegService` (`@Transactional`)
- `register(username, email, password)` — `existsByEmail` check, BCrypt encode, `UUID.randomUUID()`, `Instant.now()`, `UserRepo.save`; `DataIntegrityViolationException` re-thrown as `IllegalStateException("email already in use")`.
- `authenticate(email, password)` — `findByEmail` + `PasswordEncoder.matches`; else `UnauthorizedException("Invalid credentials")`.

### `MembershipService`
- `saveMembership(UUID userId)` → `MembershipRepo.createDefaultMembership`.

## Repositories (JdbcTemplate)

### `UserRepo`
| Method | SQL |
| :-- | :-- |
| `save(User)` | `INSERT INTO identity.users (id, email, username, password, created_at) VALUES (?,?,?,?,?)` |
| `findByEmail` | `SELECT id, email, username, password, created_at FROM identity.users WHERE email = ?` |
| `existsByEmail` | `SELECT COUNT(*) FROM identity.users WHERE email = ?` |
| `findById(UUID)` | `SELECT * FROM identity.users WHERE id = ?` → `UserRecord` |
| `allUsers()` | `SELECT * FROM identity.users` |
| `findAll(serviceName)` | `SELECT t.service_name, u.username, u.email, m.role, m.created_at FROM identity.memberships m JOIN identity.users u ON m.user_id = u.id JOIN identity.services t ON m.service_id = t.id WHERE t.service_name = ?` |

### `MembershipRepo`
| Method | SQL |
| :-- | :-- |
| `createDefaultMembership(userId)` | `SELECT id FROM identity.services` then batch `INSERT INTO identity.memberships (id, user_id, service_id, role) VALUES (?, ?, ?, 'USER')` — every new user is `USER` in every service |
| `findMembership(userId, serviceName)` | `SELECT m.role FROM identity.memberships m JOIN identity.services s ON m.service_id = s.id WHERE m.user_id = ? AND s.service_name = ?` |
| `serviceExists(serviceName)` | `SELECT COUNT(*) FROM identity.services WHERE service_name = ?` |

### `ServiceRepo`
| Method | SQL |
| :-- | :-- |
| `findByName` | `SELECT * FROM identity.services WHERE service_name = ?` |

## Data (schema `identity`, see [../infra.md](../infra.md))

`users(id, username, email UNIQUE, password, created_at)`, `services(id, service_name UNIQUE, created_at)` seeded with `portal, community, challenge, learn`, `memberships(id, user_id→users, service_id→services, role, created_at, UNIQUE(user_id, service_id))`.

## Exceptions

`UnauthorizedException extends RuntimeException`. **No `@ControllerAdvice`** — business errors surface as 500.

## Tests (`identity/src/test`)

- `BaseIntegrationTest` — `@SpringBootTest`, Testcontainers `postgres:16`, imports `TestFlywayConfig` (Flyway `schemas=identity`, `createSchemas=true`, `locations=filesystem:../infra/migrations/identity`).
- `LoginTest`: `authenticates_with_correct_password`, `rejects_wrong_password`, `rejects_unknown_email`.
- `UserRegistrationTest.java` (class `UserRegTest`): `registers_user_with_hashed_password` (starts with `$2`), `rejects_duplicate_email`.
- `JwtTokenTest`: `generates_valid_jwt` (sub + email claims) using `TestJwtFactory` (48-char secret, 900 s).

## Observations

- `identity/auth-endpoints.md` and `identity/README.md` describe OIDC/`/auth/oidc/callback`; nothing of the sort is implemented.
- No validation constraints on DTOs; no password policy; no rate limiting; no audit logging; no refresh tokens (15-minute access token only).
- No way to promote a user to `ADMIN` via API.
- Port drift: local 8082 vs docker 8080 (compose maps `8082:8080`).

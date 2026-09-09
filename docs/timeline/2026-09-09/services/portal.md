# Portal Service — 2026-09-09

**Path:** `portal/` · **Main class:** `com.cyberclub.portal.PortalServiceApplication` · **Status:** functional, small surface

## Purpose

The "administrative / home" backend. Currently provides an authorization probe, the member list (proxied from identity) and per-user settings storage. It is the reference implementation of the service-side security pattern (gateway trust → user context → policy check via identity).

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 21 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-webflux`, `spring-boot-starter-data-jpa`, `spring-boot-starter-actuator`, `jakarta.validation-api 3.0.2`, `postgresql`, `flyway-core` + `flyway-database-postgresql` 11.19.0; test: `spring-boot-starter-test`, Testcontainers, `mockwebserver 4.11.0` |
| Port | `9000` locally; docker profile `server.port=` empty → 8080 |
| Dockerfile | `maven:3.9.5-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`, `EXPOSE 8080`, `portal.jar` |

## Configuration

| Key | `application.properties` | `application-docker.properties` |
| :-- | :-- | :-- |
| `server.port` | `9000` | (empty) |
| `spring.datasource.*` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `org.postgresql.Driver` | same |
| `INTERNAL_GATEWAY_SECRET` | `test-secret` (hard-coded default for local) | not set → must come from env |
| `spring.jpa.hibernate.ddl-auto` | `none` | `none` |
| `spring.flyway.enabled`, `spring.liquibase.enabled` | `false` | `false` |
| `spring.jpa.database-platform` | `PostgreSQLDialect` | same |
| `identity.base-url` | `http://localhost:8082` | `http://identity:8080` |

## Package map

```
com.cyberclub.portal
├── PortalServiceApplication
├── config/DataSourceConfig, UserConfig (filter registration), WebClientConfig (identityWebClient)
├── context/UserContext, TraceContext                 # ThreadLocals
├── datasource/ServiceDataSource                      # search_path wrapper
├── dtos/AuthResult, ErrorResponse, Member, SettingData, User
├── exceptions/RequestException (abstract), BadRequest-, Forbidden-, NotFound-, UnauthorizedException
├── filters/GatewayTrustFilter, JwtFilter, CorrelationFilter, InternalAuthFilter (WebClient outbound)
├── repositories/UserSettingRepo
├── restcontrollers/HomeController, UserController, SettingController, ControllerExceptionHandler
├── security/AuthPolicy, Policies, ClientAuth
└── services/AuthService, InfoService, UserService, SettingService
```

## Filter chain (registered in `UserConfig`)

| Order | Filter | Reads | Effect |
| :-- | :-- | :-- | :-- |
| `HIGHEST_PRECEDENCE` | `GatewayTrustFilter` | `X-Internal-Auth` | constant-time compare with `INTERNAL_GATEWAY_SECRET`; mismatch → `401 {"error":"unauthorized","message":"Gateway validation required"}` |
| `HIGHEST_PRECEDENCE + 10` | `JwtFilter` | `X-User-Id` | missing/blank → `401 "userId missing"`; else `UserContext.set(userId)`, cleared in `finally` |
| (component) | `CorrelationFilter` | `X-Correlation-Id` | accept if matches `^[a-zA-Z0-9\-_]+$` and ≤64 chars, else new UUID; `TraceContext.setCorrelationId`; echoes `X-Correlation-Id` on the response; cleared in `finally` |

`InternalAuthFilter` is an `ExchangeFilterFunction` on the outbound `identityWebClient` adding `X-Internal-Auth: <secret>` to every call to identity.

Note the gateway sends `X-Request-Id`, not `X-Correlation-Id`, so portal always generates its own correlation id.

### Contexts
- `UserContext` — `set/get/isSet/clear`; `get()` throws `IllegalStateException` if unset.
- `TraceContext` — `setCorrelationId/getCorrelationId/clear`.

### `ServiceDataSource`
Wraps the pooled `DataSource`; every `getConnection()` executes `SET search_path TO "portal", public` (a `TenantContext` variant is commented out). Fails closed: closes the connection and rethrows on error. Pool settings are Spring defaults (HikariCP).

## Authorization model

- `AuthService.require(AuthPolicy)` → `ClientAuth.checkMembership(UUID.fromString(UserContext.get()))` → `policy.check(AuthResult)` → returns `AuthResult{allowed, role}`.
- `ClientAuth.checkMembership(id)` — `GET {identity.base-url}/private/api/member/check?userId={id}&serviceName=portal`:

| Identity status | Result |
| :-- | :-- |
| 200 | `AuthResult` body |
| 401 | `UnauthorizedException("Unauthorized")` |
| 403 | `ForbiddenException("Forbidden")` |
| 404 | `NotFoundException("Membership not found")` |
| ≥500 | `RuntimeException("Identity service unavailable")` |
| other | `RuntimeException("Unexpected response from Identity: <status>")` |

- `AuthPolicy` — functional interface with default `and()` / `or()` combinators (`or` swallows the first failure and tries the second).
- `Policies.MEMBER` — role must equal `"USER"`; `Policies.ADMIN` — role must equal `"ADMIN"`; otherwise `ForbiddenException("Unauthorized Access")`.
- `AuthResult.allowed` is never consulted; only `role` is.

## Endpoints

### `GET /portal/info` — policy `MEMBER.or(ADMIN)` → 200
```json
{ "userId": "<uuid>", "serviceName": "portal", "role": "USER|ADMIN", "message": "this user is authorized" }
```

### `GET /users` — policy `MEMBER` (role `USER` only; **ADMIN is rejected with 403**) → 200
`UserService.members()` → `GET {identity}/private/api/portal/members` → `List<Member{service_name, username, email, role, created_at}>`. Identity 403/404 are mapped to `ForbiddenException("FORBIDDEN")` / `NotFoundException("NOT FOUND")`.

### `POST /setting` — policy `ADMIN` → 200 (empty body)
Request `SettingData { theme: String, notifications_enabled: boolean, language_code: String }` (`@Valid`, no constraints).
`SettingService.setSetting` → `UserSettingRepo.setSetting(userId, …)`:
```sql
INSERT INTO user_setting (user_id, theme, notifications_enabled, language_code)
VALUES (?, ?, ?, ?)
ON CONFLICT (user_id) DO UPDATE SET theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled,
  language_code = EXCLUDED.language_code, updated_at = NOW()
```

There is **no** `GET /setting` and **no** `GET /users/{id}`, although the frontend has route handlers for both.

## Error handling — `ControllerExceptionHandler` (`@RestControllerAdvice`)

`ErrorResponse { error, message, path, correlationId, timestamp }`

| Exception | Status | `error` | `message` |
| :-- | :-- | :-- | :-- |
| `BadRequestException` | 400 | `BAD_REQUEST` | exception message |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` | exception message |
| `ForbiddenException` | 403 | `FORBIDDEN` | exception message |
| `NotFoundException` | 404 | `NOT_FOUND` | exception message |
| `DataAccessException` | 503 | `SERVICE_UNAVAILABLE` | `database is not available` |
| `Exception` | 500 | `INTERNAL_ERROR` | `internal server error` |

## Data (schema `portal`)

`user_setting(user_id UUID PK, theme TEXT, notifications_enabled BOOLEAN, language_code TEXT, created_at, updated_at)` — see [../infra.md](../infra.md).

## Tests (`portal/src/test`, Testcontainers `postgres:16`, Flyway from `../infra/migrations/portal`)

`ContextConfigTest` registers `JwtFilterTest` (a test filter that pins a fixed UUID into `UserContext`); identity is mocked with `mockwebserver`.

| Class | Tests |
| :-- | :-- |
| `PortalInfoTest` | `req_Admin_Info` 200, `req_User_Info` 200, `unauthorized_User_Info` (empty role) 403, `notFound_User_Info` 404 |
| `PortalUserTest` | `admin_canNOtRead` 403, `user_isAuthorized_butServiceNOtMocked` 500, `req_forbidden` 403, `req_unavailable` 500 |
| `PortalSettingsTest` | `admin_canUpdate_settings` 200, `user_canNotUpdate_settings` 403, `req_forbidden_settings` 403, `req_Unavailable_settings` |
| `security/GatewayTrustFilterTest` | `rejects_missing_secret_header` 401, `allows_request_with_correct_secret` |

## Observations

- Every request costs one synchronous HTTP call to identity (no caching of membership).
- `MEMBER` means literally role `USER`, so admins cannot list members; `/portal/info` is the only endpoint both roles can hit.
- `WebClientConfig` sets no timeouts/retries.
- Actuator is on the classpath; `/actuator/**` is not excluded from `GatewayTrustFilter`, so health checks also need the secret.
- README mentions announcements, events, news, admin dashboard — none exist server-side (frontend mocks them).

# Challenge Service — 2026-09-09

**Path:** `challenge/` · **Main class:** `com.cyberclub.challenge.ChallengeServiceApplication` · **Status:** scaffold only — one placeholder endpoint

## Purpose (intended)

Contests, CTFs, judge/code execution, leaderboards, hackathons (per README). **None of this is implemented.** The README also says this service is Python/FastAPI; it is Spring Boot/Java.

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 17 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-webflux`, `spring-boot-starter-data-jpa`, `spring-boot-starter-actuator`, `postgresql`, `spring-boot-starter-test` |
| Port | `9006` locally; docker profile `server.port=` empty → 8080 |
| Dockerfile | `maven:3.9.5-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine`, `EXPOSE 8080`, `challenge.jar` |

## Configuration (both profiles identical apart from `server.port`)

| Key | Value |
| :-- | :-- |
| `server.port` | `9006` (local) / empty (docker) |
| `spring.datasource.*` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `org.postgresql.Driver` |
| `spring.jpa.hibernate.ddl-auto` | `none` |
| `spring.flyway.enabled`, `spring.liquibase.enabled` | `false` |
| `spring.jpa.database-platform` | `PostgreSQLDialect` |
| `identity.base-url` | `http://identity:8080` in **both** files (local profile therefore points at a Docker hostname) |

## What exists

```
com.cyberclub.challenge
├── ChallengeServiceApplication
├── config/DataSourceConfig, UserConfig, WebClientConfig
├── context/UserContext                 # stores String, exposes setId(UUID)/getId():UUID; setRole commented out
├── filters/JwtFilter                   # HIGHEST_PRECEDENCE; X-User-Id → UUID.fromString → UserContext; no rejection
├── restcontrollers/Home                # GET / → "HOME"
├── security/ClientIdentity             # WebClient call to identity (unused)
├── security/IdentityCheckResult        # {allowed: boolean, role: String}
└── tenancy/TenantDataSource            # SET search_path TO "challenge", public
```

## Endpoints

| Method | Path | Auth | Response |
| :-- | :-- | :-- | :-- |
| GET | `/` | none | `200 "HOME"` |

## `ClientIdentity.checkMembership(UUID userId, String tenantKey)`

`GET {identity.base-url}/private/api/member/check?userId={userId}&tenantKey={tenantKey}`
- 200 → `IdentityCheckResult`; 403 → `RuntimeException("Forbidden")`; 404 → `RuntimeException("Not Found")`.
- Sends **no** `X-Internal-Auth` header (identity would answer 401) and uses `tenantKey` where identity expects `serviceName`. Not called from anywhere.

## Security

- **No** `GatewayTrustFilter` — does not verify `X-Internal-Auth`.
- `JwtFilter` calls `UUID.fromString(header)` without try/catch → malformed `X-User-Id` yields a 500 (task.txt: "refactor: UUID.fromString(string)").

## Data

Schema `challenge` is targeted by `make start` / `start-app.sh`, but `infra/migrations/challenge/` **does not exist**; no tables. Compose has no `migrate-challenge` job.

## Tests

`ChallengeServiceTest` — `@SpringBootTest` class with all test methods commented out.

## Compose

`challenge` on `9006:8080`, `SPRING_PROFILES_ACTIVE=docker`, no `depends_on`, no `INTERNAL_GATEWAY_SECRET`.

## Observations

- Gateway local-mode routes `challenge` to `localhost:9004` (this service listens on `9006`) — inverted with community.
- Frontend `/challenges` page is a static list and does not call this service.

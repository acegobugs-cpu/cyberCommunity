# Community Service — 2026-09-09

**Path:** `community/` · **Main class:** `com.cyberclub.community.CommunityServiceApplication` · **Status:** scaffold only — boots, has zero endpoints

## Purpose (intended)

Forums, groups, messaging, member profiles (per README). **None of this is implemented.**

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 17 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-actuator`, `postgresql`, `spring-boot-starter-test` |
| Port | `9004` locally; docker profile `server.port=` empty → 8080 |
| Dockerfile | `maven:3.9.5-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine`, `EXPOSE 8080`, `community.jar` |

## Configuration

| Key | `application.properties` | `application-docker.properties` |
| :-- | :-- | :-- |
| `server.port` | `9004` | (empty) |
| `spring.datasource.*` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `org.postgresql.Driver` | same |
| `spring.jpa.hibernate.ddl-auto` | `none` | `none` |
| `spring.flyway.enabled`, `spring.liquibase.enabled` | `false` | `false` |
| `spring.jpa.database-platform` | `PostgreSQLDialect` | same |
| `identity.base-url` | — | `http://identity:8080` (declared, unused) |

## What exists

```
com.cyberclub.community
├── CommunityServiceApplication
├── config/DataSourceConfig, UserConfig
├── context/UserContext                 # ThreadLocal<String>: set/get/isSet/clear
├── filters/JwtFilter                   # HIGHEST_PRECEDENCE; X-User-Id → UserContext; no rejection
└── tenancy/TenantDataSource            # SET search_path TO "community", public on every connection
```

- **No** `GatewayTrustFilter` → the service does not verify `X-Internal-Auth`; anything that can reach port 9004/8080 directly is trusted.
- **No** `CorrelationFilter`, `WebClient`, DTOs, services, repositories, controllers, or exception handlers.
- Actuator endpoints (`/actuator/health` etc.) are the only HTTP surface.

## Data

Flyway is invoked for schema `community` by `make start` / `start-app.sh` but `infra/migrations/community/` **does not exist** — the schema is created empty (or the Flyway run fails, depending on CLI behaviour with a missing location). Compose has no `migrate-community` job.

## Tests

`CommunityServiceTest` — empty `@SpringBootTest` class; no test methods.

## Compose

Started as `community` on `9004:8080` with `SPRING_PROFILES_ACTIVE=docker`, no `depends_on`, no `INTERNAL_GATEWAY_SECRET`.

## Observations

- Gateway local-mode routes `community` to `localhost:9006`, but this service listens on `9004` — local-mode traffic to community actually lands on challenge.
- `community/README.md` describes forum/post/comment/group/moderation endpoints that do not exist.

# Implementation — Stack

**Level 3** · concrete technology choices and versions

## Backend

| Choice | Version | Rationale |
| :-- | :-- | :-- |
| Java | 21 for identity, portal, learn; 17 for gateway, community, challenge | 21 is the target; 17 kept where a service was scaffolded earlier — align in a follow-up |
| Spring Boot | 3.5.9 | current GA; virtual-thread-ready |
| Web | `spring-boot-starter-web` (servlet) | simplest mental model; blocking is fine at club scale |
| HTTP client | `spring-boot-starter-webflux` for `WebClient` only | modern client API; we accept the web+webflux co-existence and pin `spring.main.web-application-type` by default (servlet) |
| Data access | `JdbcTemplate` via `spring-boot-starter-data-jpa` (for DataSource/transaction auto-config); no entities; `ddl-auto=none` | AD-7 |
| GraphQL | `spring-boot-starter-graphql` (learn only) | see domain doc |
| Validation | `hibernate-validator`, `jakarta.validation-api 3.0.2` | `@Valid` on request DTOs |
| Security libs | `spring-boot-starter-security` (identity only, for BCrypt) ; `jjwt 0.11.5` (identity, gateway) | small surface; no OAuth2 client yet |
| Migrations | Flyway 11 — CLI (`tools/flyway`) and `flyway/flyway:11` image; `flyway-core` on identity/portal classpath only for tests | AD-6 |
| Observability | `spring-boot-starter-actuator` (domain services) | health endpoints |
| Build | Maven wrapper per service (`./mvnw`), independent `pom.xml` — no parent aggregator | services are independently buildable/deployable |
| Tests | JUnit 5, `spring-boot-starter-test`, Testcontainers 1.19 (`postgres:16`), OkHttp `mockwebserver 4.11` | real DB + real migrations in tests |

## Frontend

| Choice | Version |
| :-- | :-- |
| Next.js (App Router, `proxy.ts` middleware) | 16.3.x |
| React | 19.2.x |
| TypeScript | 5, strict |
| Tailwind CSS | 4 via `@tailwindcss/postcss` |
| Lint | ESLint 9 + `eslint-config-next` |
| Browser tests | `puppeteer-core`, `selenium-webdriver` |

## Data & infra

| Choice | Notes |
| :-- | :-- |
| PostgreSQL 16 (`postgres:16-alpine`) | single instance, `multi_service_db` |
| Docker Compose | local orchestration of backend + DB + migrations |
| Dockerfiles | multi-stage `maven:3.9.5-eclipse-temurin-<jdk>` → `eclipse-temurin:<jdk>-jre-alpine`, `EXPOSE 8080` |
| GitHub Actions | build/test matrix, image push on `main` |

## Explicitly rejected for v1

- Supabase / managed auth — we want to own the identity model.
- Python/FastAPI for the judge — keep one backend language until the judge is actually designed.
- Kubernetes, service mesh, service discovery — hostnames from Compose are sufficient.
- ORM entities — see AD-7.

# Implementation — Testing & CI

**Level 3**

## 1. Test pyramid per layer

| Layer | Approach | Tooling |
| :-- | :-- | :-- |
| Gateway filters | pure unit tests with `MockHttpServletRequest` and a locally signed JWT | JUnit 5 |
| Identity | integration tests against a real PostgreSQL with the real migrations | `@SpringBootTest`, Testcontainers `postgres:16`, `TestFlywayConfig` (`filesystem:../infra/migrations/identity`) |
| Domain services (portal first) | integration tests: real DB + migrations, identity **stubbed** with MockWebServer, a test filter that injects a fixed `X-User-Id` | Testcontainers, OkHttp MockWebServer, `ContextConfigTest` |
| Learn (GraphQL) | deferred to v2 with authorization | `GraphQlTester` |
| Skeleton services | context-loads test only | `@SpringBootTest` |
| Frontend | browser-driven smoke of the signup flow; component tests deferred | Puppeteer (Firefox), Selenium + geckodriver |

## 2. Shared patterns

- `BaseIntegrationTest`: starts one static Testcontainers Postgres per JVM, pushes `spring.datasource.*` as system properties in `@BeforeAll`.
- `TestFlywayConfig`: `@TestConfiguration` bean `Flyway` with `schemas=<schema>`, `createSchemas=true`, `initMethod="migrate"`.
- Authorization matrix tests name their cases by role and outcome (`admin_canUpdate_settings`, `user_canNotUpdate_settings`, `req_forbidden`, `req_unavailable`).
- Tests never call another running service; everything external is stubbed.

## 3. What must be covered before a service is "v1 done"

| Service | Minimum |
| :-- | :-- |
| gateway | valid / missing / invalid JWT |
| identity | register (hash), duplicate e-mail, login ok, wrong password, unknown e-mail, JWT claims |
| portal | each endpoint × {USER, ADMIN, no role}, identity 404, identity 5xx, trust filter accept/reject |
| learn, community, challenge | context loads |

## 4. Running

```bash
make test                # all services, logs in logs/<svc>.log (needs Docker for Testcontainers)
cd identity && ./mvnw test
cd frontend && node browser-test.mjs   # against a running stack on :3000
```

## 5. CI — GitHub Actions (`.github/workflows/ci.yml`)

Triggers: push to `main`, `feature/**`; PRs to `main`.

Job `build_and_deploy`, matrix over the six services, `fail-fast: false`:
1. checkout
2. setup-java temurin (JDK matching the service: 21 or 17)
3. cache `~/.m2/repository` keyed on the service `pom.xml`
4. `cd <svc> && ./mvnw clean verify -B`
5. on push to `main`: docker login, `docker/build-push-action` with context `./<svc>`, tags `<registry>/<svc>:latest` and `:<sha>`

Job `integration_test` (needs `build_and_deploy`): placeholder in v1; will bring the stack up with Compose and run the smoke test from [local-dev-and-docker.md](local-dev-and-docker.md).

Testcontainers in CI requires the Docker socket, which `ubuntu-latest` provides.

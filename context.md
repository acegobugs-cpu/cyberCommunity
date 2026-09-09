# Cyber Club Portal — Agent Context

Compact, always-accurate map of this repo for AI assistants. Read this first; open the linked docs only when the task needs them. Keep it under ~120 lines — if something needs more room it belongs in `docs/`, not here.

## What this is

Monorepo for a university cyber-club platform. Next.js frontend + six Spring Boot services behind an API gateway, one PostgreSQL with **one schema per service**, Flyway migrations run *outside* the apps.

```
gateway/ identity/ portal/ learn/ community/ challenge/   Spring Boot 3.5.9, one independent pom each (option A — no shared module yet)
frontend/                                                 Next.js 16 App Router, BFF route handlers under src/app/api/**
infra/migrations/<schema>/V*.sql                          Flyway, per schema; infra/start-app.sh, flyway*.conf
docker-compose.yml  Makefile  .env(git-ignored)           local orchestration
docs/plan/            layered design (vision → architecture → domains → implementation → roadmap)
docs/timeline/<date>/ as-built snapshots + gaps.md        ← source of truth for "what exists"
```

## State (2026-09-09)

| Component | Status |
| :-- | :-- |
| gateway | ✅ resolves service (Host subdomain → `X-Service-Name` → `portal`), verifies HS256 JWT, proxies with `X-Internal-Auth`, `X-User-Id`, `X-Request-Id`; unauthenticated → routed to identity |
| identity | ✅ `POST /signup`, `POST /signin`, `/private/api/**` (member check, members list); BCrypt(12); JWT 900 s. No OIDC/refresh tokens |
| portal | ✅ `GET /portal/info` (MEMBER or ADMIN), `GET /users` (MEMBER = role `USER` only), `POST /setting` (ADMIN). Reference service for filters/policies/error handler |
| learn | ✅ GraphQL `courses`, `course`, `createCourse`, `createLesson`; **no authorization**; no tests |
| community / challenge | 🚧 skeletons: datasource + `X-User-Id` filter only; no GatewayTrustFilter, no endpoints (challenge has `GET /` → "HOME") |
| frontend | ✅ signup/signin/dashboard/members/settings wired via BFF; **httpOnly cookie session** (`ccp_session`), JWT never reaches the browser. Announcements/events/community/learn/challenges = static or mock |
| infra | Compose runs services from source (`./mvnw spring-boot:run`) + Flyway jobs for identity/portal/learn + frontend; CI file is at `.github/workflow/` (singular → not discovered) |

Known defects: `docs/timeline/2026-09-09/gaps.md`. Open TODOs: `task.txt`.

## Hard rules (do not violate without asking)

1. **Schema-per-service.** A service touches only its own schema; cross-service data goes over HTTP to identity's `/private/api/**`. No cross-schema SQL, no FKs across schemas.
2. **Header contract.** Gateway → service: `X-Internal-Auth` (shared secret, constant-time compare), `X-User-Id`, `X-Request-Id`. Services never parse JWTs. Authorization = `auth.require(Policies.MEMBER | ADMIN)` after a call to identity `GET /private/api/member/check?userId&serviceName`.
3. **Migrations are external.** `spring.flyway.enabled=false`, `ddl-auto=none` everywhere. New tables = new `infra/migrations/<schema>/V<n>__*.sql` (+ Compose `migrate-<schema>` job if the schema has none yet).
4. **JdbcTemplate + records, hand-written SQL.** No JPA entities.
5. **Frontend never calls the gateway directly.** Browser → `/api/*` route handler → `forwardToGateway` / `gatewayFetch` (`src/lib/gateway.ts`). Server components use `src/lib/data/*` + `getSessionToken()`; client uses `src/lib/api.ts` + `useAuth()`.
6. **Java by default.** Other languages only for the planned off-request-path components: judge (Python), CTF infra controller (Go), media (Go|Rust), analytics (Python). See README.
7. **Stay on option A** (independent Maven projects). Do not introduce a shared `common` module or collapse services without an explicit decision (README → "Structure decision to revisit").
8. Filters that set ThreadLocals (`UserContext`, `TraceContext`) must clear them in `finally`.

## Ports & config

| | local JVM | compose |
| :-- | :-- | :-- |
| gateway 8080 · identity 8082 · portal 9000 · learn 9002 · community 9004 · challenge 9006 · frontend 3000 · postgres 5433 | `server.port` in `application.properties` | all services 8080 in-container, same host ports; postgres 5432 |

Env every service needs: `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`; plus `JWT_SECRET` (identity, gateway; ≥32 chars), `INTERNAL_GATEWAY_SECRET` (gateway, identity, portal, learn). `SPRING_PROFILES_ACTIVE=docker` selects `application-docker.properties` (`identity.base-url=http://identity:8080`, `gateway.localMode=false`).

## Commands

```bash
docker compose up                       # postgres → flyway → services → frontend
make start | test | stop | status       # local JVMs; logs in logs/<svc>.log; SS="identity portal" to filter
cd <svc> && ./mvnw test                 # identity/portal need Docker (Testcontainers)
cd frontend && npm run dev | npm run lint | npx tsc --noEmit | npx next build
docker logs migrate-identity            # verify migrations; tables are in schemas → use \dn / \dt identity.*
```

## Package layout every Java service follows

`config/` (DataSourceConfig, UserConfig, WebClientConfig) · `context/` (UserContext, TraceContext) · `datasource/ServiceDataSource` (SET search_path) · `filters/` (GatewayTrustFilter, JwtFilter, CorrelationFilter, InternalAuthFilter) · `security/` (AuthPolicy, Policies, ClientAuth) · `dtos/` records mirrored in `frontend/src/lib/types.ts` · `repositories/` · `services/` · `restcontrollers/` (+ ControllerExceptionHandler → `ErrorResponse{error,message,path,correlationId,timestamp}`). Portal is the canonical copy.

## Where to look

| Need | Open |
| :-- | :-- |
| Exact endpoints / SQL / filters of a service | `docs/timeline/2026-09-09/services/<svc>.md` |
| Why a decision was made | `docs/plan/01-architecture.md` (AD-1…AD-9), `docs/plan/03-implementation/*.md` |
| What to build next | `docs/plan/04-roadmap.md`, `gaps.md`, `task.txt` |
| Frontend routes / BFF / auth flow | `docs/timeline/2026-09-09/frontend.md` (note: auth is now cookie-based, see gaps.md fix log) |

## Do not read / ingest

`**/target/`, `frontend/node_modules/`, `frontend/.next/`, `frontend/package-lock.json`, `tools/`, `logs/`, `.env`, `*.jar` — see `.copilotignore`. Prefer `grep_search`/`read_file` on specific paths over whole-folder listings of `docs/`.

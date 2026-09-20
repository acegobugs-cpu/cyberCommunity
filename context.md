# Cyber Club Portal — Agent Context

Compact, always-accurate map of this repo for AI assistants. Read this first; open the linked docs only when the task needs them. Keep it under ~120 lines — if something needs more room it belongs in `docs/`, not here.

## What this is

Monorepo for a university cyber-club platform. Next.js frontend + six Spring Boot services behind an API gateway, one PostgreSQL with **one schema per service**, Flyway migrations run *outside* the apps.

```
gateway/ identity/ portal/ learn/ community/ challenge/   Spring Boot 3.5.9, one independent pom each (option A — no shared module yet)
frontend/                                                 Next.js 16 App Router, BFF route handlers under src/app/api/**
infra/migrations/<schema>/V*.sql                          Flyway, per schema; infra/start-app.sh, flyway*.conf
docker-compose.yml  Makefile  .env(git-ignored)           local orchestration
docs/plan 00/         platform foundation plan (vision → architecture → domains → implementation → roadmap) — done
docs/plan 01/         Learn plan: goals → domain model → API → data / labs+Go runner / frontend → roadmap L0–L7 — CURRENT WORK
docs/timeline/<date>/ as-built snapshots + gaps.md        ← source of truth for "what exists"
```

## State (2026-09-10)

| Component | Status |
| :-- | :-- |
| gateway | ✅ resolves service (Host subdomain → `X-Service-Name` → `portal`), verifies HS256 JWT, proxies with `X-Internal-Auth`, `X-User-Id`, `X-Request-Id`; unauthenticated → routed to identity |
| identity | ✅ `POST /api/auth/signup?service=<svc>` (creates account + **membership in that service only**), `POST /api/auth/signin`, `POST /api/memberships/{service}` (explicit, idempotent join → fresh token; needs `X-User-Id` from gateway); `/private/api/**` (member check, members list, `/{svc}/members/{userId}`); BCrypt(12); JWT 900 s; errors → 401 `UnauthorizedException` / 404 / 409 `ConflictException` / 500 via `ControllerExceptionHandler`. No default memberships anymore. No OIDC/refresh tokens |
| portal | ✅ `GET /portal/info` (MEMBER or ADMIN), `GET /users` (MEMBER = role `USER` only), `POST /setting` (ADMIN). Reference service for filters/policies/error handler |
| learn | ✅ **L1 content + L2 progress**: `paths(status DRAFT\|PUBLISHED\|ARCHIVED, slug, difficulty, tags[], estimated_minutes cache)` → **`path_modules(path_id, module_id, position)`** → `modules` (reusable, no path/position of their own) → `lessons(type READING\|VIDEO\|QUIZ\|LAB\|PROJECT, position)` ("courses" were renamed **paths**). Progress: `enrollments(status ENROLLED\|COMPLETED\|DROPPED, progress)`, `module_progress(status STARTED\|IN_PROGRESS\|COMPLETED\|DROPPED)` (per user×module, shared across paths), `completed_lessons`; progress is **derived in Postgres** by `learn.recompute_progress(user,module)` → `recompute_path_progress(user,path)` for every containing path (trigger on `completed_lessons`; `ProgressRepo.recomputeAll/recomputeAllForPath` on author edits). GraphQL: `paths(filter)`, `path(slug)`, `pathById`, `lesson`, `myEnrollments`, `Path.enrollment{status,progress,nextLessonId}`, `Module.myProgress`, `Lesson.completed`; learner `enroll/dropPath/startModule(moduleId,pathId?)/dropModule/completeLesson(lessonId,pathId?)` (idempotent; implicit enroll into `pathId`, or the single published path containing the module); author `modules(search)`, `upsertPath/Module/Lesson`, `addModuleToPath/removeModuleFromPath`, `reorderModules/Lessons`, `publishPath`, `archivePath`, `deleteModule/Lesson`. Learners see lessons in ≥1 PUBLISHED path; `@BatchMapping` for modules/lessons. Auth via `Policies.LEARNER` / `CONTENT_AUTHOR`; 27 integration tests. **V1 rewritten (paths + path_modules) — dev DB needs `DROP SCHEMA learn CASCADE` + re-migrate.** ✅ **L3 roadmaps** (V3): `roadmaps` + `roadmap_items(path_id|module_id, position=step, group_type ALL|CHOICE, is_required)`; **not enrolled** — `learn.roadmap_progress(user, roadmap)` derives % from enrollments/module_progress (step = mean of required items, CHOICE = best; optional items ignored); GraphQL `roadmaps/roadmap(slug)/roadmapById/myRoadmaps` (touched roadmaps, most advanced first), `RoadMap.items{item: Path|Module, progress}`, `Module.paths`; author `upsertRoadmap/setRoadmapItems(replace-all)/publishRoadmap/archiveRoadmap/deleteRoadmap`. Drafts flag for nested batch resolvers travels in `GraphQLContext` (`Access.DRAFTS`). Next: L4 quizzes |
| community / challenge | 🚧 skeletons: datasource + `X-User-Id` filter only; no GatewayTrustFilter, no endpoints (challenge has `GET /` → "HOME"). Challenge already has a correct identity client (`ClientIdentity` + outbound `InternalAuthFilter`) ready for its first authorised endpoint |
| frontend | ✅ **host-per-area routing**: `learn.<root>`→`src/app/sites/learn`, `/learn` on portal host redirects (`src/proxy.ts`, `lib/subdomains.ts areaUrl()`); dev hosts `*.localhost:3000` or `*.cyberclub.test` via /etc/hosts + `SESSION_COOKIE_DOMAIN`. signup/signin/dashboard/members/settings wired via BFF; **httpOnly cookie session** (`ccp_session`), JWT never reaches the browser. Announcements/events/community/learn/challenges = static or mock |
| infra | Compose runs services from source (`./mvnw spring-boot:run`) + Flyway jobs for identity/portal/learn + frontend; CI file is at `.github/workflow/` (singular → not discovered) |

Known defects: `docs/timeline/2026-09-09/gaps.md` (A1–A4, A6–A9, A12 fixed; A5, A10, A11 + sections B/C open). Open TODOs: `task.txt`.

## Hard rules (do not violate without asking)

1. **Schema-per-service.** A service touches only its own schema; cross-service data goes over HTTP to identity's `/private/api/**`. No cross-schema SQL, no FKs across schemas.
2. **Header contract.** Gateway → service: `X-Internal-Auth` (shared secret, constant-time compare), `X-User-Id`, `X-Request-Id` (the one trace id — services read + echo it, identity puts it in error bodies; there is no `X-Correlation-Id`). Services never parse JWTs. Authorization = `auth.require(Policies.MEMBER | ADMIN)` after a call to identity `GET /private/api/member/check?userId&serviceName`.
3. **Migrations are external.** `spring.flyway.enabled=false`, `ddl-auto=none` everywhere. New tables = new `infra/migrations/<schema>/V<n>__*.sql` (+ Compose `migrate-<schema>` job if the schema has none yet).
4. **JdbcTemplate + records, hand-written SQL.** No JPA entities.
5. **Frontend never calls the gateway directly.** Browser → `/api/*` route handler → `forwardToGateway` / `gatewayFetch` (`src/lib/gateway.ts`). Server components use `src/lib/data/*` + `getSessionToken()`; client uses `src/lib/api.ts` + `useAuth()`. **Sessions are multi-account** (`src/lib/server/session.ts`): `ccp_accounts` (Domain-wide httpOnly, all signed-in accounts + JWTs, max 5) and `ccp_active` (host-only: which account THIS app uses). Each app (portal/learn/…) picks its own active account; `/signin` `/signup` render on every host (`?next=` returns you). `POST /api/membership/{svc} {accountId?}` = "continue as X in svc" (joins + activates). Signout `?scope=all` removes the account everywhere. **Learn has one door:** `POST /api/learn/graphql`; server code uses `lib/data/learn.ts`, client uses `lib/learn/client.ts`; operation strings in `src/graphql/learn-documents.ts`, types generated into `src/graphql/generated.ts` by `npm run codegen` (schema = `learn/src/main/resources/graphql/schema.graphqls`). Learn pages live in `src/app/sites/learn/**` and are served on the `learn.` host (`/` = account switcher → redirects to `/dash` when signed in; `/dash` catalogue + "Continue" strip + roadmaps, `/paths/[slug]`, `/paths/[slug]/lessons/[id]`, `/roadmaps/[slug]`, `/admin`, `/admin/paths/[id]`, `/admin/roadmaps/[id]`).
6. **Java by default.** Other languages only for planned off-request-path / internal-action components: **lab-runner (Go, Plan 01 L6 — domain-neutral, holds the Docker socket, no DB)**, judge (Python), media (Go|Rust), analytics (Python). See README.
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
| Why a platform decision was made | `docs/plan 00/01-architecture.md` (AD-1…AD-9), `docs/plan 00/03-implementation/*.md` |
| Learn: model / API / DDL / labs | `docs/plan 01/01-domain-model.md`, `02-api.md`, `03-data-and-migrations.md`, `04-labs-and-runner.md` |
| What to build next | `docs/plan 01/06-roadmap.md` (current phase), `gaps.md`, `task.txt` |
| Frontend routes / BFF / auth flow | `docs/timeline/2026-09-09/frontend.md` (note: auth is now cookie-based, see gaps.md fix log) |

## Do not read / ingest

`**/target/`, `frontend/node_modules/`, `frontend/.next/`, `frontend/package-lock.json`, `tools/`, `logs/`, `.env`, `*.jar` — see `.copilotignore`. Prefer `grep_search`/`read_file` on specific paths over whole-folder listings of `docs/`.

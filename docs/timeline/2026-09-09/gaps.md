# Gaps, Bugs and Inconsistencies — 2026-09-09

Baseline for the next snapshot. Grouped by severity; each item names the file(s) involved.

> **Update (same day, later):** items marked ~~struck~~ were fixed after the snapshot was taken. See the *Fix log* at the bottom.

## A. Bugs / functional defects

| # | Item | Where |
| :-- | :-- | :-- |
| ~~A1~~ | ~~Gateway local-mode port map swaps community (→9006) and challenge (→9004)~~ **fixed** — map now `challenge 9006`, `community 9004` | `gateway/.../ProxyController.java` |
| ~~A2~~ | ~~Identity has no `@ControllerAdvice`~~ **fixed** — `ControllerExceptionHandler` maps `UnauthorizedException→401`, `IllegalStateException→409`, other→500. ⚠ imports `javax.servlet.http.HttpServletRequest`; Spring Boot 3 needs `jakarta.servlet.http.HttpServletRequest` or the class will not compile | `identity/.../ControllerExceptionHandler.java` |
| ~~A3~~ | ~~Frontend `api/members` calls the gateway without `Authorization`~~ **fixed** — `lib/data/members.ts` reads the session cookie and sends `Authorization`; server components call it directly (they previously fetched their own `/api/*` with a relative URL, which fails in Node) | `frontend/src/lib/data/members.ts`, `app/api/members/route.ts`, `app/page.tsx`, `(portal)/members/page.tsx` |
| ~~A4~~ | ~~Frontend `GET /api/setting` and `GET /api/users/[id]` forward to portal endpoints that do not exist~~ **fixed (frontend side)** — `users/[id]` route deleted; `setting` GET removed, settings page starts from defaults. Backend `GET /setting` / `GET /users/{id}` remain unimplemented (portal v2) | `frontend/src/app/api/setting/route.ts`, `(portal)/settings/page.tsx` |
| A5 | `POST /setting` requires role `ADMIN`; `GET /users` requires exactly `USER`. Every registered user is `USER`. **Frontend side mitigated:** settings page shows the role and disables Save unless `ADMIN`; header hides Settings for non-admins. Backend policy/role-granting still needs a decision | `portal/.../Policies.java`, `SettingService.java`, `UserService.java`; `identity/.../MembershipRepo.java` |
| A6 | Challenge `JwtFilter` does `UUID.fromString(header)` unguarded → 500 on malformed `X-User-Id` | `challenge/.../filters/JwtFilter.java` (task.txt "UUID.fromString") |
| A7 | Challenge `ClientIdentity` uses query param `tenantKey` (identity expects `serviceName`) and sends no `X-Internal-Auth` | `challenge/.../security/ClientIdentity.java` |
| A8 | `make restart` passes `SERVICES=` but the Makefile reads `SS` | `Makefile` |
| A9 | Compose runs `learn` with `maven:3.9.5-eclipse-temurin-17` while `learn/pom.xml` targets Java 21 | `docker-compose.yml` |
| A10 | CI workflow lives in `.github/workflow/` (singular) and uses JDK 11 → never runs, and would fail if it did | `.github/workflow/ci.yml` |
| A11 | `make start` / `start-app.sh` try to migrate `community` and `challenge` schemas from `infra/migrations/<schema>` folders that do not exist | `Makefile`, `infra/start-app.sh` |
| A12 | Gateway sends `X-Request-Id`; portal/learn read `X-Correlation-Id` → correlation ids never match across hops | `gateway/.../Forward.java`, `portal|learn/.../CorrelationFilter.java` |

## B. Security gaps

| # | Item |
| :-- | :-- |
| B1 | Community and challenge have **no `GatewayTrustFilter`** — anything reaching them directly is trusted (only `X-User-Id` header needed). |
| B2 | Learn GraphQL has **no authorization**: any caller with the gateway secret (i.e. any valid JWT via gateway) can create courses/lessons. |
| B3 | Gateway never returns 401 on bad/expired JWT; it silently reroutes to identity. |
| ~~B4~~ | ~~No refresh tokens; 15-minute access token; frontend never checks `exp`.~~ **Frontend fixed** — JWT now lives in an httpOnly `ccp_session` cookie with `Max-Age = expiresIn`; `/api/session` and `getSessionToken()` reject expired tokens; any BFF 401 signs the client out. Refresh tokens still absent (backend). |
| B5 | No DTO validation (`@NotBlank`, `@Email`, `@Size`) in identity or portal; no password policy; no rate limiting on `/signin` / `/signup`. |
| B6 | Portal `application.properties` hard-codes `INTERNAL_GATEWAY_SECRET=test-secret`; `start-app.sh` and Flyway confs commit dev credentials. |
| B7 | `/actuator/**` is neither excluded from trust filters nor protected — health checks need the secret in portal/learn and are fully open in community/challenge. |
| ~~B8~~ | ~~Frontend JWT decode is unsigned base64 parsing~~ **fixed** — the browser never receives the JWT; decoding happens server-side in the BFF for display/expiry only, the gateway still verifies. Token no longer stored in `localStorage`. |
| B9 | No `X-User-Role` propagation (claimed in SYSTEM_DESIGN.md); every authorized request costs a synchronous identity call with no caching. |

## C. Unimplemented features (README/SYSTEM_DESIGN claims vs. code)

| Claim | Reality |
| :-- | :-- |
| Python FastAPI challenge/judge service | Challenge is Spring Boot with `GET /` → `"HOME"`; no judge |
| Supabase (DB + auth) | Plain PostgreSQL 16; own JWT auth |
| OAuth2 + OIDC, university-email validation | Email/password + BCrypt only; `.env` has placeholder OIDC vars; `identity/auth-endpoints.md` describes a non-existent `/auth/oidc/callback` |
| Forums, groups, messaging, profiles (community) | Zero endpoints |
| Contests, CTFs, leaderboards, hackathons (challenge) | Zero endpoints |
| Courses/modules, progress tracking, quizzes (learn) | Courses + lessons CRUD only; no progress, quizzes, enrolment |
| Admin dashboard, news & events, announcements (portal) | Not in backend; frontend serves in-memory mock data |
| `X-User-Role` header, distributed logging, service discovery | Not present |
| GitHub Actions CI/CD | File exists but is not discoverable (A10) |
| ~~Frontend in Docker Compose~~ | **fixed** — `frontend` service (`node:20-alpine`, source-mounted, `npm run dev`, port 3000, `NEXT_PUBLIC_GATEWAY_URL=http://gateway:8080`) |

## D. Code-quality / hygiene

- `CourseSerivce` typo (learn).
- `spring-boot-starter-data-jpa` on every service classpath with zero JPA entities; gateway needs a live DB just to boot.
- `spring-boot-starter-web` + `spring-boot-starter-webflux` together everywhere WebClient is used (task.txt).
- `UserContext`/`TraceContext` set in learn/community/challenge but never read.
- `AuthResult.allowed` never consulted (portal).
- `application-docker.properties` duplicates the default profile almost verbatim; `server.port=` left empty (task.txt "spring profiles should be conditional").
- No defaults / fail-fast validation for `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `INTERNAL_GATEWAY_SECRET` (task.txt).
- `IDENTITY_SERVICE_URL` / `LEARN_SERVICE_URL` / `PORTAL_SERVICE_URL` set in compose but unused.
- Test file `UserRegistrationTest.java` contains class `UserRegTest`.
- Learn has no tests; community/challenge test classes are empty.
- `service-baseline/` migration folder is empty; `flyway-learn.conf` missing while identity/portal have confs.
- Frontend: ~~`SUBDOMAIN_NAV` hard-codes production URLs~~ (fixed — derived from `SUBDOMAIN_PATHS`); ~~member row links are `#`~~ (fixed — plain rows until a detail page exists); language selector has no i18n; no loading skeletons; ~~`public/` still holds Next defaults~~ (already removed).
- README.md has duplicated paragraphs/table rows and a duplicated "Getting Started" step list. *(rewritten same day)*

## E. task.txt (verbatim, still open)

```
rename: application-docker.properties -- spring profiles should be conditional not hardcoded.
refactor: add defaults for environment variables in application.properties
refactor: Validate required environment variables and provide clear startup feedback.
refactor: Docker file mvnw needs to be executable chmod +x
refactor: Thread local clear enforcement
refactor: webflux and starter-web conflicting
refactor: UUID.fromString(string)
profile active docker issues
```

## Fix log (2026-09-09, after snapshot)

**Frontend auth moved from `localStorage` to an httpOnly cookie (BFF session).**

| Change | Files |
| :-- | :-- |
| Server session helpers: cookie name `ccp_session`, `httpOnly`, `SameSite=Lax`, `Secure` in production, `Max-Age = expiresIn`; unsigned decode for `sub`/`email`/`exp` pre-check only | `frontend/src/lib/server/session.ts` |
| `POST /api/signin`, `POST /api/signup` call identity, set the cookie, return `{user, expiresIn}` — the token never reaches the browser | `frontend/src/lib/server/auth-handler.ts`, `app/api/signin/route.ts`, `app/api/signup/route.ts` |
| `GET /api/session` hydrates the client (`{user, portalRole}` or 401); `POST /api/signout` clears the cookie | `app/api/session/route.ts`, `app/api/signout/route.ts` |
| `forwardToGateway` injects `Authorization` from the cookie, strips `cookie`/`x-user-id`/`x-internal-auth` upstream and `set-cookie` downstream; new `gatewayFetch()` for server code | `frontend/src/lib/gateway.ts` |
| `api.ts` no longer handles tokens; `credentials: same-origin`; 401 → `onUnauthorized` hook | `frontend/src/lib/api.ts` |
| `AuthProvider` exposes `{user, portalRole, isAdmin, loading, signin, signup, signout, refresh}`; no `token` | `frontend/src/lib/auth-context.tsx` |
| Server data layer used by both route handlers and server components | `frontend/src/lib/data/members.ts`, `lib/data/portal.ts` |
| Pages updated: home, members (live data when signed in, "sample data" notice otherwise), dashboard, settings (admin notice, Save disabled for non-admins), announcements/events (mock directly), header (Settings admin-only), layout nav (relative paths) | `frontend/src/app/**`, `components/site-header.tsx` |
| Frontend added to Compose | `docker-compose.yml` |

Verified with `tsc --noEmit`, `eslint src`, `next build` (all clean).

**Still open on the frontend:** i18n behind the language selector; loading skeletons; member detail page (needs backend `GET /users/{id}`); CSRF hardening for cookie-authenticated POSTs (currently `SameSite=Lax` + same-origin BFF; add an origin check or CSRF token before exposing cross-site).

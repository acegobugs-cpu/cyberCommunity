# General Overview — 2026-09-09

## 1. What the application is

A monorepo for a university cyber-club platform. It is split into a Next.js frontend and six Java/Spring Boot backend services that share a single PostgreSQL instance using **one schema per service**. All browser traffic to the backend goes through an **API gateway** which validates JWTs and stamps trusted headers onto internal requests.

## 2. Repository layout

```
Cyber-Club-Portal/
├── docker-compose.yml        # backend + postgres + flyway migration jobs (no frontend)
├── Makefile                  # local (non-docker) start/test/stop of Java services
├── .env                      # git-ignored; secrets + ports (see infra.md)
├── task.txt                  # informal TODO list
├── README.md, SYSTEM_DESIGN.md
├── .github/workflow/ci.yml   # NOTE: singular "workflow" — GitHub will not run it
├── gateway/     identity/    portal/    learn/    community/    challenge/   # Spring Boot services
├── frontend/                 # Next.js 16 app
├── infra/                    # flyway confs, migrations/, start-app.sh
├── tools/flyway/             # vendored Flyway 11 CLI (git-ignored)
└── logs/                     # per-service logs from `make start` (git-ignored)
```

## 3. Tech stack actually in use

| Layer | Technology | Notes |
| :-- | :-- | :-- |
| Frontend | Next.js 16.3.4, React 19.2.8, TypeScript 5, Tailwind CSS 4 | App Router, `src/proxy.ts` (Next 16 middleware convention) |
| Backend | Spring Boot 3.5.9 | identity/portal/learn on Java 21; gateway/community/challenge on Java 17 |
| Data access | `JdbcTemplate` with hand-written SQL | `spring-boot-starter-data-jpa` is on the classpath but no JPA entities exist; `ddl-auto=none` |
| GraphQL | `spring-boot-starter-graphql` | learn service only; GraphiQL enabled |
| HTTP client | Spring WebFlux `WebClient` | gateway proxying and portal→identity / challenge→identity calls |
| Auth | HS256 JWT via `jjwt 0.11.5`; BCrypt (strength 12) | No OAuth2/OIDC implementation exists |
| Database | PostgreSQL 16 | single DB `multi_service_db`, schemas `identity`, `portal`, `learn` (+ `community`, `challenge` created empty by Flyway) |
| Migrations | Flyway 11 (CLI and `flyway/flyway:11` image) | `spring.flyway.enabled=false` in every service; migrations run externally |
| Containers | Docker Compose | services run `./mvnw spring-boot:run` from bind-mounted source, not from the Dockerfiles |
| CI | GitHub Actions file present | see infra.md for why it is currently ineffective |

**Not present despite README claims:** Python/FastAPI, Supabase, OAuth2/OIDC, a judge system, forums/messaging, progress tracking.

## 4. Ports

| Service | Local (`make start` / `application.properties`) | Docker host→container | Gateway local-mode target |
| :-- | :-- | :-- | :-- |
| gateway | 8080 (default) | 8080→8080 | — |
| identity | 8082 | 8082→8080 | `localhost:8082` |
| portal | 9000 | 9000→8080 | `localhost:9000` |
| learn | 9002 | 9002→8080 | `localhost:9002` |
| community | **9004** | 9004→8080 | **`localhost:9006`** (mismatch) |
| challenge | **9006** | 9006→8080 | **`localhost:9004`** (mismatch) |
| postgres | 5433 (host, per `.env` `LOCAL_DB_PORT`) | 5432→5432 in compose | — |
| frontend | 3000 (`npm run dev`) | not in compose | — |

The gateway's `LOCAL_SERVICE_PORTS` map swaps community and challenge relative to their own `server.port` settings — see [gaps.md](gaps.md).

## 5. Request lifecycle

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js (route handler)
    participant G as Gateway :8080
    participant S as Service (portal/learn/…)
    participant I as Identity
    participant DB as PostgreSQL

    B->>N: fetch /api/users (Authorization: Bearer jwt from localStorage)
    N->>G: GET /users, X-Service-Name: portal, Authorization forwarded
    G->>G: ServiceFilter → serviceName (Host subdomain, else X-Service-Name, else "portal")
    G->>G: JwtFilter → authenticated? userId, email (never rejects)
    Note over G: if !authenticated → service forced to "identity"
    G->>S: same method+path+body; strip Authorization/X-User-Id/X-Internal-Auth;<br/>add X-Internal-Auth, X-User-Id, X-Request-Id
    S->>S: GatewayTrustFilter (X-Internal-Auth == secret) → 401 otherwise
    S->>S: JwtFilter (X-User-Id → ThreadLocal UserContext)
    S->>I: GET /private/api/member/check?userId&serviceName (X-Internal-Auth)
    I->>DB: SELECT role FROM identity.memberships …
    I-->>S: {allowed, role}
    S->>S: Policy check (MEMBER / ADMIN)
    S->>DB: SET search_path TO "<schema>", public; query
    S-->>G: response
    G-->>N: response (status + headers + body passed through)
    N-->>B: response
```

## 6. Authentication and authorization model

1. **Registration/login** — `POST /signup` and `POST /signin` on identity (reached through the gateway, which routes unauthenticated traffic to identity). Passwords are BCrypt(12) hashed. On success identity returns `{accessToken, tokenType:"Bearer", expiresIn:900}`.
2. **JWT** — HS256, secret `JWT_SECRET` (≥32 chars enforced by identity), claims `sub`=user UUID, `email`, `iss="identity-service"`, `iat`, `exp` (+900 s). No refresh token.
3. **Gateway** — verifies signature/expiry with the same `JWT_SECRET` and issuer `identity-service`. Failure does **not** produce 401; it sets `authenticated=false` and forces the target to `identity`.
4. **Header propagation** — gateway sets `X-Internal-Auth: <INTERNAL_GATEWAY_SECRET>`, `X-User-Id: <sub>`, `X-Request-Id: <uuid>`. `X-User-Role` (mentioned in SYSTEM_DESIGN.md) is **not** propagated.
5. **Service trust** — identity, portal and learn reject any request whose `X-Internal-Auth` does not equal the secret (constant-time compare) with 401. Community and challenge have **no** such filter.
6. **Membership / roles** — identity keeps `identity.memberships(user_id, service_id, role)`. On sign-up every user gets role `USER` in all four services (`portal`, `community`, `challenge`, `learn`). Portal asks identity `/private/api/member/check` per request and applies `Policies.MEMBER` (role `USER`) / `Policies.ADMIN` (role `ADMIN`). There is no endpoint to grant `ADMIN`; it must be set in the DB.
7. **Frontend** — token and decoded user stored in `localStorage["ccp.auth"]`; no expiry check client-side.

## 7. Data isolation

Each service wraps its `DataSource` (`ServiceDataSource` / `TenantDataSource`) and runs `SET search_path TO "<schema>", public` on every `getConnection()`. Schemas: `identity`, `portal`, `learn`, `community`, `challenge`. Only identity, portal and learn have tables (see [infra.md](infra.md)). Cross-service data access is done via identity's `/private/api/**` HTTP endpoints, never via cross-schema SQL.

## 8. Cross-service calls that exist today

| Caller | Callee | Path | Purpose |
| :-- | :-- | :-- | :-- |
| gateway | any service | `/**` | transparent proxy |
| portal `ClientAuth` | identity | `GET /private/api/member/check?userId&serviceName=portal` | per-request authorization |
| portal `UserService` | identity | `GET /private/api/portal/members` | member list for `GET /users` |
| challenge `ClientIdentity` | identity | `GET /private/api/member/check?userId&tenantKey=` | defined but unused; wrong param name, no `X-Internal-Auth` |
| frontend route handlers | gateway | `/signup`, `/signin`, `/users`, `/users/{id}`, `/portal/info`, `/setting` | via `forwardToGateway()` with `X-Service-Name` |

## 9. How to run (as the repo stands)

**Docker (backend only):**
```bash
docker compose up            # needs .env: POSTGRES_*, POSTGRES_URL, JWT_SECRET, INTERNAL_GATEWAY_SECRET
cd frontend && npm install && npm run dev   # frontend is not in compose; talks to http://localhost:8080
```
Compose runs Flyway for `identity`, `portal`, `learn` only, then starts each service with `./mvnw spring-boot:run` and `SPRING_PROFILES_ACTIVE=docker`.

**Local JVMs:**
```bash
make start        # waits for postgres on :5433, migrates 5 schemas with tools/flyway, starts all 6 services → logs/<svc>.log
make test         # ./mvnw test per service (identity/portal use Testcontainers → needs Docker)
make stop | restart | status
# or: ./infra/start-app.sh (hard-coded dev secrets)
```

## 10. Environment variables consumed by code

| Variable | Used by | Required |
| :-- | :-- | :-- |
| `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | all 6 services (`spring.datasource.*`) | yes, no defaults |
| `JWT_SECRET` | identity (`security.jwt.secret`), gateway | yes; ≥32 chars for identity |
| `INTERNAL_GATEWAY_SECRET` | gateway (`Forward`), identity, portal, learn | yes (portal `application.properties` hard-codes `test-secret` for local) |
| `SPRING_PROFILES_ACTIVE=docker` | all services in compose | selects `application-docker.properties` |
| `NEXT_PUBLIC_GATEWAY_URL` | frontend | default `http://localhost:8080` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | frontend | default `cyberclubportal.com` |
| `IDENTITY_SERVICE_URL`, `LEARN_SERVICE_URL`, `PORTAL_SERVICE_URL` | set in compose for gateway but **not read by code** | — |

## 11. Tests that exist

| Service | Tests | Needs Docker |
| :-- | :-- | :-- |
| gateway | `JwtFilterTest` (3) | no |
| identity | `LoginTest` (3), `UserRegTest` (2), `JwtTokenTest` (1) | yes (Testcontainers postgres:16, Flyway from `../infra/migrations/identity`) |
| portal | `PortalUserTest` (4), `PortalInfoTest` (4), `PortalSettingsTest` (4), `GatewayTrustFilterTest` (2) | yes |
| learn | none | — |
| community | empty `@SpringBootTest` class | — |
| challenge | empty `@SpringBootTest` class, body commented out | — |
| frontend | `browser-test.mjs` (Puppeteer/Firefox), `selenium-test.mjs` (geckodriver) — manual scripts for the signup flow | no |

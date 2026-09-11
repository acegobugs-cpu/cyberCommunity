# 🛡️ Cyber Club Portal

## Project Overview

The **Cyber Club Portal** is a **service-oriented modular platform** designed to serve as the central hub for cybersecurity clubs, universities, and technical communities.

Its primary purpose is to **foster education, collaboration, and competitive skill development** by providing dedicated services for learning, communication, and hands-on challenges. Each functional area is its own service with its own data, behind a single gateway and a single login.

> **Status legend used throughout this file:** ✅ implemented · 🚧 partial / skeleton · 📋 planned
> Detailed as-built documentation lives in [`docs/timeline/`](docs/timeline/2026-09-09/README.md); the design plans live in numbered folders — [`docs/plan 00/`](docs/plan%2000/README.md) (platform foundation, done) and [`docs/plan 01/`](docs/plan%2001/README.md) (Learn, in progress). Each plan is a sequence of phases that end in something concrete and finished.

---

## 🏛️ Service Ecosystem

| Service | Purpose | Key Features | Status |
| :-- | :-- | :-- | :-- |
| **Gateway** | Single public entry point. Resolves the target service, verifies the JWT, injects trusted internal headers, proxies. | Subdomain / `X-Service-Name` routing, JWT verification, `X-User-Id` / `X-Internal-Auth` / `X-Request-Id` propagation | ✅ |
| **Identity** | Users, credentials, per-service memberships and roles, token issuance. | `/signup`, `/signin`, HS256 JWT, BCrypt, internal member-check API | ✅ (e-mail + password) · 📋 OIDC / university SSO, refresh tokens, admin promotion |
| **Portal** | The **administrative and public-facing backbone**; the reference implementation of the service security template. | `GET /portal/info`, member directory `GET /users`, `POST /setting`, policy-based authorization (`MEMBER`, `ADMIN`) | ✅ core · 📋 **Admin Dashboard**, **News & Events**, **Announcements** (currently mocked in the frontend) |
| **Learn** | The **structured learning environment**. | GraphQL API: courses, ordered lessons | ✅ content model · 📋 **Progress Tracking**, **Quizzes & Assessments**, enrolment, role-gated mutations |
| **Community** | The **social and collaboration hub**. | — | 🚧 skeleton · 📋 **Forums**, **Groups**, Direct/Group **Messaging**, Member Profiles |
| **Challenge** | The **competitive hands-on environment**. | `GET /` placeholder | 🚧 skeleton · 📋 **Programming Contests**, **CTFs**, **Leaderboards**, **Hackathons**; delegates execution to the Judge |
| **Frontend** | Next.js UI + BFF route handlers. | Sign-up/in, dashboard, members, settings wired to backend; announcements/events/community/learn/challenges as static or mock placeholders | ✅ shell · 🚧 data sources |

### 📋 Planned polyglot components

These are the components where a language other than Java is justified by the problem, not by preference. Rule: *Java by default; another language only for a component that (a) is off the user request path or an internal action endpoint, (b) has a concrete runtime/ecosystem reason, and (c) is owned by one domain **or** is domain-neutral infrastructure that stores no business data.* The first such component is the **lab-runner (Go)**, specified in [`docs/plan 01/04-labs-and-runner.md`](docs/plan%2001/04-labs-and-runner.md).

| Component | Owner domain | Language | Why this language | Integration |
| :-- | :-- | :-- | :-- | :-- |
| **lab-runner** (= "CTF infrastructure controller") | domain-neutral infra; clients: Learn (labs), Challenge (CTF instances) | **Go** | Docker Engine SDK, netlink/WireGuard libraries, goroutine TTL reaper, static binary; only component holding the Docker socket | Internal REST `POST/GET/DELETE /instances` with `X-Internal-Auth`; state = Docker labels, no DB; per-session isolated networks, resource limits, hard TTL. Plan 01 Phase L6 |
| **Judge / sandbox worker** | Challenge | **Python** | Fork/exec, cgroups, seccomp, per-run throwaway containers, CTF tooling (pwntools, checkers); JVM start-up per run is unsuitable | Worker, not behind the gateway. Polls `challenge.submissions` (`FOR UPDATE SKIP LOCKED`), runs in `docker run --rm --network none …`, writes verdict |
| **CTF infrastructure controller** | Challenge | **Go** | *merged into the lab-runner above* — Challenge adds multi-container specs, WireGuard peers, team instances in Plan 02 | — |
| **Media / attachment pipeline** | Portal (or own `media` schema) | **Go or Rust** — *undecided* | Untrusted binary parsing (images, PDFs) isolated from the main app; memory safety (Rust) vs. simpler ops (Go) | Behind the gateway for uploads → forces the gateway to stream bodies instead of buffering 2 MB; object storage (MinIO/S3) + signed URLs |
| **Analytics / batch jobs** | cross-domain, read-only | **Python** | pandas / numpy / scikit-learn; nightly leaderboard recompute, completion stats, submission anomaly detection | Must respect schema-per-service: reads via each service's internal API or per-schema read-only DB roles, never cross-schema SQL |

Explicitly **not** planned as separate languages: rewriting the gateway or Community for "performance" — Java 21 virtual threads cover both.

---

## 🛠️ Tech Stack & Architecture

### Core Technologies

| Component | Technology | Role | Status |
| :-- | :-- | :-- | :-- |
| **Frontend (UI/UX)** | **Next.js 16** (App Router), React 19, TypeScript 5, Tailwind CSS 4 | SSR/SSG UI plus BFF route handlers that forward to the gateway | ✅ |
| **Backend (Core Logic)** | **Java 17/21 · Spring Boot 3.5** | Gateway, Identity, Portal, Learn, Community, Challenge | ✅ |
| **Backend (Judge / Analytics)** | **Python** | Sandbox worker, batch jobs | 📋 |
| **Backend (Infra controller / Media)** | **Go** (media: Go or Rust) | Container/network orchestration, untrusted-file processing | 📋 |
| **Database** | **PostgreSQL 16** | Single instance, **one schema per service** | ✅ |
| **Migrations** | **Flyway 11** (CLI + `flyway/flyway:11` image), run *outside* the apps | Version-controlled DDL per schema | ✅ |
| **Build System** | **Maven Wrapper (`mvnw`)**, one independent `pom.xml` per service | Build and dependency management | ✅ |
| **API Style** | **REST + GraphQL Hybrid** | REST for Identity/Portal; GraphQL for Learn | ✅ |
| **Data Access** | **Spring `JdbcTemplate`** with hand-written SQL | Explicit control, keeps the schema boundary visible | ✅ |
| **Auth** | **HS256 JWT** issued by Identity, **BCrypt(12)** | 15-minute access tokens | ✅ · 📋 OAuth2/OIDC as an additional credential source |

### Deployment & Environment

- **Local development:** `docker compose up` brings up Postgres, the Flyway migration jobs and all six Java services (run from bind-mounted source via `./mvnw spring-boot:run`). The frontend runs on the host with `npm run dev`. ✅
- **Alternative:** `make start` runs the services as local JVMs against a host Postgres, migrating with the vendored Flyway CLI. ✅
- **Images:** every service has a multi-stage Dockerfile (`maven → temurin-jre-alpine`, `EXPOSE 8080`). ✅
- **CI/CD:** GitHub Actions matrix build/test + image push per service. 🚧 (workflow file exists but needs to move to `.github/workflows/` and use JDK 17/21)
- **Frontend in Compose, judge/infra-controller containers:** 📋

---

## ⚙️ Implementation Details

### Service Routing & Authentication

| Feature | Strategy | Details |
| :-- | :-- | :-- |
| **Service Resolution** | **API Gateway Routing** | Subdomain (`learn.<domain>`) → `X-Service-Name` header → default `portal`. Unauthenticated requests always go to Identity (this is how `/signup` and `/signin` are reached). |
| **Data Isolation** | **Dedicated Schema per Service** | One PostgreSQL database; schemas `identity`, `portal`, `learn`, `community`, `challenge`. Each service wraps its `DataSource` and runs `SET search_path TO "<schema>", public` on every connection. No cross-schema SQL. |
| **Authentication** | **JWT (HS256)** | Identity issues; Gateway verifies with the shared `JWT_SECRET` and issuer `identity-service`. 📋 OAuth2 + OIDC with **University Email** validation as an additional flow. |
| **Security Context** | **Identity Propagation** | Gateway strips `Authorization` and injects `X-Internal-Auth` (shared secret), `X-User-Id`, `X-Request-Id`. Services verify the secret (constant-time compare) and bind `X-User-Id` to a request-scoped context. 📋 `X-User-Role` propagation / membership caching. |
| **Authorization** | **Per-service membership roles** | Identity stores `memberships(user_id, service_id, role)`; sign-up grants `USER` in every service. Services ask `GET /private/api/member/check` and apply composable policies (`Policies.MEMBER`, `Policies.ADMIN`). |
| **Service Communication** | **Internal REST calls** | Services call Identity over HTTP with `X-Internal-Auth`. Planned non-Java components follow the same header contract. |

### Database Strategy (Schema-Per-Service)

- **Schema Activation:** each service is pinned to its own schema via `search_path`, preventing accidental cross-service access.
- **Schema Migration:** Flyway, one run per schema with its own history table, executed by Compose one-shot containers (`migrate-identity`, `migrate-portal`, `migrate-learn`) or the CLI (`make start`). Applications start with `spring.flyway.enabled=false`.
- **Current tables:** `identity.{users, services, memberships}`, `portal.user_setting`, `learn.{courses, lessons}`. `community` and `challenge` have no tables yet.

---

## 📁 Repository Structure (Monorepo)

```
Cyber-Club-Portal/
├── gateway/      identity/    portal/    learn/    community/    challenge/   # Spring Boot services (one pom each)
├── frontend/                 # Next.js app
├── infra/                    # flyway confs, migrations/<schema>/, start-app.sh
├── tools/flyway/             # vendored Flyway CLI (git-ignored)
├── docs/
│   ├── plan 00/              # platform foundation plan (done): vision → architecture → domains → implementation → roadmap
│   ├── plan 01/              # Learn plan (current): goals → domain model → API → data / labs+runner / frontend → roadmap L0–L7
│   └── timeline/<date>/      # dated as-built snapshots + gaps
├── docker-compose.yml  Makefile  .env (git-ignored)  task.txt
└── 📋 lab-runner/ (Go, Plan 01)  judge/ (Python)  media/  analytics/    # planned polyglot components
```

### 🤔 Structure decision to revisit: Maven multi-module

Today each Java service is a fully independent Maven project (**option A**). Consequence: the security plumbing (`GatewayTrustFilter`, `JwtFilter`, `CorrelationFilter`, `UserContext`, `TraceContext`, `ServiceDataSource`, `AuthPolicy`, `ControllerExceptionHandler`) is copy-pasted across services and already drifting.

The alternative to keep considering is a **Maven multi-module build (option C)**:

```
pom.xml                     # parent: modules, dependencyManagement, single java.version
common/                     # non-bootable: filters, contexts, datasource wrapper, policies, error handling
gateway/ identity/ portal/ learn/ community/ challenge/   # thin bootable modules depending on common
```

- **Keeps:** six deployables, gateway, schema-per-service, Compose/ports — it is a build/source decision, not a runtime one.
- **Gains:** one implementation of shared plumbing, one dependency BOM, one JDK, `./mvnw -pl portal -am` builds.
- **Costs:** coupling through `common` (must hold *infrastructure only*, never domain types), lock-step upgrades, Docker build context becomes the repo root, CI matrix loses per-folder isolation.
- **Decision (2026-09-09):** stay on A for now; revisit when the third copy of a shared class needs the same fix. Do **not** collapse to a single application (option B) — that would remove the gateway and the service boundaries this project exists to practise.

---

## 🚀 Getting Started

1. **Prerequisites:** Docker + Docker Compose; Node 20+ for the frontend. (For `make start`: JDK 21, a local PostgreSQL on port 5433, and the Flyway CLI under `tools/flyway/`.)
2. **Configuration:** create `.env` at the repo root:
   ```dotenv
   POSTGRES_USER=appuser_dev
   POSTGRES_PASSWORD=dev_secure_password
   POSTGRES_DB=multi_service_db
   POSTGRES_URL=jdbc:postgresql://postgres:5432/multi_service_db?user=appuser_dev&password=dev_secure_password
   DATABASE_URL=jdbc:postgresql://localhost:5433/multi_service_db
   LOCAL_DB_PORT=5433
   JWT_SECRET=<at least 32 random characters>
   INTERNAL_GATEWAY_SECRET=<random string>
   ```
3. **Run the backend:**
   ```bash
   docker compose up          # postgres → flyway jobs → services
   ```
   Verify migrations with `docker logs migrate-identity` and `docker exec postgres psql -U appuser_dev -d multi_service_db -c '\dn'` (tables live in per-service schemas, so a bare `\dt` shows nothing).
4. **Run the frontend:**
   ```bash
   cd frontend && npm install && npm run dev     # http://localhost:3000
   ```
5. **Smoke test:** open `http://localhost:3000/signup`, register, land on `/dashboard` with role `USER`.

### Ports

| Service | Local JVM | Compose (host→container) |
| :-- | :-- | :-- |
| gateway | 8080 | 8080→8080 |
| identity | 8082 | 8082→8080 |
| portal | 9000 | 9000→8080 |
| learn | 9002 | 9002→8080 |
| community | 9004 | 9004→8080 |
| challenge | 9006 | 9006→8080 |
| postgres | 5433 | 5432→5432 |
| frontend | 3000 | — |

---

## 🗺️ Roadmap (summary)

See [`docs/plan 00/04-roadmap.md`](docs/plan%2000/04-roadmap.md) (platform phases, done), [`docs/plan 01/06-roadmap.md`](docs/plan%2001/06-roadmap.md) (Learn phases L0–L7, current), and [`docs/timeline/2026-09-09/gaps.md`](docs/timeline/2026-09-09/gaps.md) for the current defect list.

1. Identity hardening — error → status mapping, DTO validation, admin promotion endpoint, refresh tokens.
2. Portal v2 — announcements & events API (retire frontend mocks), `GET /setting`, `GET /users/{id}`.
3. **Learn (Plan 01, current)** — L0 harden → L1 courses/modules/typed lessons + authoring → L2 enrollment & progress → L3 roadmaps → L4 quizzes → L5 projects & review → L6 labs + **lab-runner (Go)** → L7 seed & snapshot.
4. Challenge (Plan 02) — contests/CTFs/leaderboards API + **Judge worker (Python)**; extends the lab-runner with multi-container specs, WireGuard, team instances.
5. Community v2 — forums, groups, messaging.
6. **Media pipeline (Go or Rust)**, **analytics jobs (Python)**.
7. Platform — gateway 401s and streaming bodies, membership caching, rate limiting, frontend in Compose, JDK alignment, config fail-fast validation, fix CI location, and re-evaluate the Maven multi-module structure.

# Snapshot — 2026-09-09

A complete, code-grounded description of what the Cyber Club Portal does **as of this date**. Everything here was verified against source files, not against the root `README.md` (which over-states several features — see [gaps.md](gaps.md)).

## Contents

| File | Covers |
| :-- | :-- |
| [general.md](general.md) | Architecture, request lifecycle, auth model, tech stack, ports, how to run |
| [services/gateway.md](services/gateway.md) | API gateway: service resolution, JWT check, header injection, proxying |
| [services/identity.md](services/identity.md) | Sign-up / sign-in, JWT issuance, memberships, internal lookup APIs |
| [services/portal.md](services/portal.md) | Portal REST API: info, members, settings; policy-based authorization |
| [services/learn.md](services/learn.md) | Learn GraphQL API: courses and lessons |
| [services/community.md](services/community.md) | Community service (scaffold only) |
| [services/challenge.md](services/challenge.md) | Challenge service (scaffold only) |
| [frontend.md](frontend.md) | Next.js app: pages, API route handlers, auth context, mock data, styling, tests |
| [infra.md](infra.md) | Docker Compose, Makefile, start script, Flyway configs, every migration, CI, env vars |
| [gaps.md](gaps.md) | What is not done, inconsistencies, bugs, and README-vs-code discrepancies |

## One-paragraph summary

Six Spring Boot services (`gateway`, `identity`, `portal`, `learn`, `community`, `challenge`) sit behind a Next.js 16 frontend and share one PostgreSQL 16 database with a schema per service, migrated by Flyway. Users can **register and log in** (identity issues a 15-minute HS256 JWT), the **gateway** validates the JWT and forwards requests with `X-User-Id` / `X-Internal-Auth` / `X-Request-Id` headers, and **portal** exposes three authorized endpoints (`GET /portal/info`, `GET /users`, `POST /setting`) that check membership roles against identity. **Learn** exposes a GraphQL API for courses/lessons with no authorization. **Community** and **challenge** are runnable skeletons with no business endpoints. The frontend has working sign-up/sign-in/dashboard/members/settings flows against the backend and serves announcements, events, community, learn and challenges from static or mock data.

## Completeness at a glance

| Component | State |
| :-- | :-- |
| Gateway | Functional (proxy + JWT + routing) |
| Identity | Functional (email/password only; no OIDC, no refresh tokens) |
| Portal | Functional, small surface (3 endpoints) |
| Learn | Functional GraphQL CRUD, unauthenticated |
| Community | Skeleton — filters + datasource only, zero endpoints |
| Challenge | Skeleton — one `GET /` returning `"HOME"` |
| Frontend | Auth + members + settings wired to backend; everything else mock/static |
| Infra | Compose (backend only), Makefile, Flyway migrations for identity/portal/learn; CI file present but mis-located and on JDK 11 |

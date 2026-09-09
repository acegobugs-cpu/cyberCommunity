# docs/plan

The design plan for the Cyber Club Portal, written **before implementation** in the voice of "this is what we will build and how". It is layered: each level narrows the previous one.

> Note: this plan set was reconstructed on 2026-09-09 to capture the decisions that produced the code as it stands. The as-built state is recorded separately in [../timeline/2026-09-09/](../timeline/2026-09-09/README.md); deviations between plan and reality are listed in that snapshot's `gaps.md`.

This folder is intentionally separate from `docs/timeline/`:

| Folder | Answers | Tense |
| :-- | :-- | :-- |
| `docs/timeline/<YYYY-MM-DD>/` | "What does the app do **right now**?" | present, descriptive |
| `docs/plan/` | "What do we intend to build and how?" | future, prescriptive |

## Layers

| Level | Folder / file | Question it answers |
| :-- | :-- | :-- |
| 0 — Vision | [00-vision.md](00-vision.md) | Why are we building this? For whom? What is out of scope? |
| 1 — Architecture | [01-architecture.md](01-architecture.md) | What is the shape of the system? Which boxes, arrows, boundaries? |
| 2 — Domains | [02-domains/](02-domains/) | What does each service / the frontend own, and what contracts does it expose? |
| 3 — Implementation | [03-implementation/](03-implementation/) | Concretely how: stack, security mechanics, data, service template, dev/docker, tests/CI |
| 4 — Roadmap | [04-roadmap.md](04-roadmap.md) | In what order, and what does "done" mean per phase? |

### 02-domains

| File | Scope |
| :-- | :-- |
| [gateway.md](02-domains/gateway.md) | Edge routing, JWT verification, header enrichment |
| [identity.md](02-domains/identity.md) | Users, credentials, memberships, tokens, internal lookup API |
| [portal.md](02-domains/portal.md) | Home/admin backbone, member directory, settings |
| [learn.md](02-domains/learn.md) | Courses and lessons (GraphQL) |
| [community.md](02-domains/community.md) | Forums, groups, messaging |
| [challenge.md](02-domains/challenge.md) | Contests, CTFs, judge, leaderboards |
| [frontend.md](02-domains/frontend.md) | Next.js app, subdomain UX, BFF route handlers |

### 03-implementation

| File | Scope |
| :-- | :-- |
| [stack.md](03-implementation/stack.md) | Languages, frameworks, versions, libraries, why |
| [security-model.md](03-implementation/security-model.md) | JWT format, header contract, filter chain, roles, policies |
| [data-and-migrations.md](03-implementation/data-and-migrations.md) | Schema-per-service, search_path, Flyway layout, initial DDL |
| [service-template.md](03-implementation/service-template.md) | Package layout, filters, datasource wrapper, error handling, config every service must follow |
| [local-dev-and-docker.md](03-implementation/local-dev-and-docker.md) | Ports, `.env`, Makefile, Compose, start script |
| [testing-and-ci.md](03-implementation/testing-and-ci.md) | Test strategy per layer, Testcontainers, GitHub Actions |

## Reading order

1. `00-vision.md` → `01-architecture.md` (everyone)
2. `03-implementation/service-template.md` + `security-model.md` (anyone writing a backend service)
3. The `02-domains/<service>.md` you are working on
4. `03-implementation/local-dev-and-docker.md` before running anything

## Conventions for future plans

- New initiatives go in a new file under the matching level (e.g. a `## v2` section in `02-domains/community.md`, or a new `03-implementation/refresh-tokens.md`).
- Start each with **Goal**, **Current state** (link to the latest timeline snapshot), **Proposed change**, **Done when**.
- When implemented, do not delete — add `Status: done (see docs/timeline/<date>)` at the top.
- Known gaps to draw from: the latest snapshot's `gaps.md` and the repo-root `task.txt`.

# Plan 01 — Learn

**Scope:** turn the Learn slot delivered by [Plan 00](../plan%2000/README.md) into the club's structured learning environment: **roadmaps → courses → modules → lessons**, with **quizzes**, **projects** and hands-on **labs**, plus enrollment and progress tracking. Introduces the platform's first non-Java component (the Go **lab-runner**).

**Status:** in progress — starts at Phase L0. Current as-built Learn: [../timeline/2026-09-09/services/learn.md](../timeline/2026-09-09/services/learn.md).

**Depends on (from Plan 00):** gateway routing to `learn`, identity `/private/api/member/check`, the service template (filters, policies, error body), schema `learn`, frontend BFF + cookie session.

## Layers

| Level | File | Question it answers |
| :-- | :-- | :-- |
| 0 — Goals | [00-goals.md](00-goals.md) | What does a member / an author experience? What is out of scope? |
| 1 — Domain model | [01-domain-model.md](01-domain-model.md) | Entities, relationships, states, glossary |
| 2 — API | [02-api.md](02-api.md) | GraphQL schema, internal REST, authorization per operation, error mapping, why GraphQL |
| 3 — Data | [03-data-and-migrations.md](03-data-and-migrations.md) | `V2 … V7` DDL, migration of existing rows, indexes |
| 4 — Labs & runner | [04-labs-and-runner.md](04-labs-and-runner.md) | Why Go, the lab-runner contract, isolation, TTL, flags, how Challenge reuses it |
| 5 — Frontend | [05-frontend.md](05-frontend.md) | Pages, BFF route, markdown rendering, admin authoring UI |
| 6 — Roadmap | [06-roadmap.md](06-roadmap.md) | Phases L0–L7, each with "done when" |

## Language decisions in this plan

| Component | Language | Reason |
| :-- | :-- | :-- |
| `learn` service (content, progress, quiz grading, project review, flag checks, lab session bookkeeping) | **Java / Spring Boot** (existing) | CRUD + authorization + transactions — nothing here needs another runtime |
| `lab-runner` (start/stop/inspect isolated containers with TTL) | **Go** | Docker Engine SDK, cgroup/netns control, goroutine-based reaper, static binary. Domain-neutral infrastructure; **the same component the README calls "CTF infrastructure controller"** — Challenge (Plan 02) reuses it |
| Coding exercises inside lessons | — (deferred) | would reuse the Python judge from Plan 02; lesson type `exercise` is reserved, not built here |

This refines the polyglot rule from the README: a non-Java component must be (a) off the user request path *or* an internal action endpoint, (b) justified by a runtime/ecosystem fact, and (c) **owned by one domain or be domain-neutral infrastructure that stores no business data**. The lab-runner satisfies (c) via the second clause.

## Reading order

1. `00-goals.md` → `01-domain-model.md`
2. `02-api.md` (anyone touching resolvers or the frontend)
3. `06-roadmap.md` to pick the current phase, then the specific level-3 file it references

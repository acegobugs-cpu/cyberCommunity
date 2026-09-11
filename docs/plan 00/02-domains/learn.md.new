# Domain — Learn (slot)

**Level 2** · schema `learn` · **Plan 00 delivers the slot only.** The Learn domain itself — courses, modules, lessons, roadmaps, quizzes, projects, labs — is planned in [Plan 01 — Learn](../../plan%2001/README.md).

## What Plan 00 provides for Learn

| Item | Value |
| :-- | :-- |
| Schema | `learn`, pinned via `SET search_path TO "learn", public` |
| Port / routing | local 9002, container 8080; gateway routes `learn.<domain>` / `X-Service-Name: learn` |
| Migrations | `infra/migrations/learn/V1__learn_course_relation.sql` (`courses`, `lessons`) + Compose `migrate-learn` job |
| Service template | `GatewayTrustFilter`, `JwtFilter` (anonymous-tolerant), `CorrelationFilter`, `InternalAuthFilter` + identity `WebClient`, `ServiceDataSource` |
| Baseline API | GraphQL (`spring-boot-starter-graphql`, GraphiQL on): `courses`, `course(id)`, `createCourse`, `createLesson` — a smoke test that the GraphQL stack works through the gateway, **not** the final content model |
| Not included | authorization on operations, tests, modules/roadmaps/progress/quizzes/projects/labs |

## Why GraphQL was chosen for this slot

Learn's reads are nested (course → modules → lessons → progress) and will grow many optional fields; one GraphQL endpoint avoids a proliferation of REST shapes. Spring for GraphQL stays inside the standard Spring Boot template. This decision is inherited and elaborated by Plan 01.

## Hand-off state (2026-09-11)

Baseline works end-to-end through the gateway with a valid JWT; no authorization; `CourseSerivce` typo; no tests; frontend `/learn` is a static placeholder. Plan 01 Phase L0 starts by hardening this baseline.

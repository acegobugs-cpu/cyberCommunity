# Project Guidelines

Start by reading [context.md](../context.md) (≈100 lines: repo map, current state, hard rules, ports, commands). Do not re-derive that information by scanning the tree.

## Working efficiently in this repo

- Never read or list `**/target/`, `frontend/node_modules/`, `frontend/.next/`, `frontend/package-lock.json`, `tools/`, `logs/`, `.env`, `*.jar` (see `.copilotignore`).
- Prefer `grep_search` / targeted `read_file` over directory walks. `docs/timeline/**` is large — open only the file the task needs.
- One service = one independent Maven project; edit inside that folder. Shared plumbing is intentionally duplicated (see README → "Structure decision to revisit"); when fixing a filter/context/datasource class, check the sibling copies in portal/learn/community/challenge.
- Run the relevant check before declaring done: `cd <svc> && ./mvnw -q test` (identity/portal need Docker), `cd frontend && npx tsc --noEmit && npm run lint`.

## Conventions

- Backend: Spring Boot 3.5.9, `JdbcTemplate` + records, hand-written SQL, `jakarta.*` imports (never `javax.servlet`). New tables go in `infra/migrations/<schema>/V<n>__*.sql`, never via `ddl-auto`.
- Frontend: Next.js 16 App Router, TypeScript strict, Tailwind 4 `htb-*` tokens. Browser → `/api/*` BFF → gateway; session is an httpOnly cookie (`src/lib/server/session.ts`); client uses `src/lib/api.ts` + `useAuth()`.
- Docs: when behaviour changes, update `docs/timeline/<date>/gaps.md` (fix log) or add a new dated snapshot — do not edit `docs/plan/` to match code; the plan records intent.
- Keep `context.md` current when ports, endpoints, rules or commands change; it is the cheapest context the agent has.

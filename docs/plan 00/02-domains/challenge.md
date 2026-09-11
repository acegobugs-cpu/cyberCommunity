# Domain — Challenge

**Level 2** · schema `challenge` · **skeleton in v1**

## Responsibility

Competitive practice: contests and CTF events, challenge catalogue with flags/test cases, an automated judge for code submissions, leaderboards, hackathon registration.

## v1 scope: skeleton only

Same intent as Community — a real service in the topology with none of the domain yet:

- standard configuration and `docker` profile; local port 9006 / container 8080,
- `SET search_path TO "challenge", public` datasource wrapper,
- `X-User-Id` → `UserContext` (typed as `UUID` here, since the challenge domain will key everything by user id),
- a placeholder `GET /` returning `"HOME"` so the route can be smoke-tested through the gateway,
- an identity client stub (`ClientIdentity.checkMembership`) prepared for the first authorized endpoint,
- empty `@SpringBootTest`.

No tables, no migrations in v1.

## v2 model (sketch)

```
contests(id, slug, title, starts_at, ends_at, difficulty, status)
challenges(id, contest_id, title, category, points, description, flag_hash | judge_spec)
submissions(id, challenge_id, user_id, payload, verdict, score, submitted_at)
leaderboard (materialised view over submissions)
```

## v2 API sketch

`GET /contests`, `GET /contests/{slug}`, `POST /contests/{id}/join` (MEMBER), `POST /challenges/{id}/submit` (MEMBER), `GET /contests/{id}/leaderboard`; admin CRUD (ADMIN). Judge executes untrusted code in isolated containers — a separate worker, not inside this service's JVM.

## Security

Full service template when the first endpoint lands. Judge isolation is a hard requirement before any code-execution feature ships.

## Frontend

`/challenges` page ships static placeholder CTF cards (status/difficulty badges, Join/Notify buttons) matching the final design.

# Domain — Portal

**Level 2** · schema `portal` · the **reference service**: first to implement the full [service template](../03-implementation/service-template.md)

## Responsibility

The club's home/admin backbone. In v1 it proves the security pipeline end-to-end and gives the frontend the three things it needs to render a dashboard: *who am I here*, *who else is here*, *my settings*.

## Domain model (v1)

```
user_setting(user_id UUID PK, theme TEXT, notifications_enabled BOOLEAN, language_code TEXT, created_at, updated_at)
```
`user_id` refers to `identity.users.id` logically; no FK across schemas (AD-1).

## API (v1)

| Endpoint | Policy | Behaviour |
| :-- | :-- | :-- |
| `GET /portal/info` | `MEMBER or ADMIN` | Echo `{userId, serviceName:"portal", role, message}` — the authorization smoke test the dashboard calls |
| `GET /users` | `MEMBER` | Member directory: proxy identity `GET /private/api/portal/members` → `[{service_name, username, email, role, created_at}]` |
| `POST /setting` | `ADMIN` | Upsert `user_setting` for the caller from `{theme, notifications_enabled, language_code}` |

## Authorization design

- `AuthService.require(policy)` → call identity `/private/api/member/check?userId=<X-User-Id>&serviceName=portal` → `AuthResult{allowed, role}` → `policy.check(result)`.
- `AuthPolicy` is a composable functional interface with `and` / `or`.
- `Policies.MEMBER` = role `USER`; `Policies.ADMIN` = role `ADMIN`. Failing a policy throws `ForbiddenException`.
- Identity responses map to exceptions: 401→Unauthorized, 403→Forbidden, 404→NotFound, 5xx→"Identity service unavailable".

## Error contract

`@RestControllerAdvice` producing `ErrorResponse{error, message, path, correlationId, timestamp}`:
`BadRequest 400 · Unauthorized 401 · Forbidden 403 · NotFound 404 · DataAccessException 503 · anything else 500`.

## Configuration

Standard service vars + `identity.base-url` (`http://localhost:8082` local, `http://identity:8080` docker), `server.port=9000`.

## Tests

Testcontainers + portal Flyway migrations; identity stubbed with MockWebServer; a test filter injects a fixed `X-User-Id`. Cover: admin/user access matrix for each endpoint, forbidden, not-found, identity-down paths; gateway-trust filter accept/reject.

## Later (v2)

Announcements and events tables + CRUD (currently mocked in the frontend); `GET /setting`; `GET /users/{id}`; admin user management; membership cache.

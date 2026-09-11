# Domain — Community

**Level 2** · schema `community` · **skeleton in v1**

## Responsibility

Discussion and collaboration: forums (categories → threads → posts), interest groups, direct/group messaging, member profiles.

## v1 scope: skeleton only

Deliver a running Spring Boot service that already sits in the right place in the topology so the platform can be brought up as a whole:

- boots with the standard configuration (`DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `docker` profile),
- pins connections to the `community` schema (`SET search_path TO "community", public`),
- binds `X-User-Id` into a request-scoped `UserContext`,
- exposes Actuator health,
- is routed by the gateway (`community` subdomain / `X-Service-Name: community`) on local port 9004 / container port 8080,
- has an (empty) `@SpringBootTest` proving the context loads.

No tables, no endpoints, no migrations in v1.

## v2 model (sketch, to be refined before implementation)

```
categories(id, slug, name, description, color)
threads(id, category_id, author_id, title, created_at, pinned)
posts(id, thread_id, author_id, body, created_at, edited_at)
groups(id, slug, name, description, created_at)
group_members(group_id, user_id, role, joined_at)
messages(id, sender_id, recipient_id|group_id, body, sent_at)
```

## v2 API sketch

REST: `GET /categories`, `GET /categories/{slug}/threads`, `POST /threads` (MEMBER), `POST /threads/{id}/posts` (MEMBER), moderation endpoints (ADMIN); groups CRUD; messaging later, possibly over websockets.

## Security

Adopt the full service template (gateway-trust filter, correlation filter, identity `WebClient`, policies) **when the first endpoint lands**; the skeleton carries only the user-context filter.

## Frontend

`/community` page ships static placeholder content (categories + groups) styled to the final design so the navigation is complete on day one.

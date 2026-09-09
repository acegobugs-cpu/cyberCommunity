# Domain — Gateway

**Level 2** · depends on [01-architecture.md](../01-architecture.md) AD-2, AD-4 · implemented per [03-implementation/security-model.md](../03-implementation/security-model.md)

## Responsibility

The only public backend endpoint. Route, authenticate, enrich, forward. Zero business logic, zero persistence.

## Inputs → outputs

| Input | Output |
| :-- | :-- |
| Any HTTP request on `/**` | The same request replayed against exactly one downstream service, response passed back verbatim |

## Service resolution (in order)

1. First label of the `Host` header (e.g. `learn.cyberclubportal.com` → `learn`). Skip when host is an IP literal or bare `localhost`. Validate against `^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$`.
2. `X-Service-Name` header.
3. Default `portal`.

The resolved name must be one of `identity | portal | learn | challenge | community`; otherwise the request is rejected.

## Authentication

- Read `Authorization: Bearer <jwt>`; verify HS256 signature with `JWT_SECRET` and issuer `identity-service`.
- On success expose `authenticated=true`, `userId=sub`, `email` to the routing step.
- On any failure expose `authenticated=false` and **continue** — the routing step will send the request to identity. The gateway itself never answers 401 in v1; identity/services decide.

## Header contract

| Direction | Header | Rule |
| :-- | :-- | :-- |
| strip | `Authorization` | never forwarded downstream |
| strip | `X-User-Id`, `X-Internal-Auth` | client-supplied values are discarded |
| add | `X-Internal-Auth` | `INTERNAL_GATEWAY_SECRET` |
| add | `X-User-Id` | JWT `sub` (absent when unauthenticated) |
| add | `X-Request-Id` | fresh UUID per request |
| pass | everything else | untouched |

## Downstream addressing

| Mode | Base URL |
| :-- | :-- |
| local (`gateway.localMode=true`, default) | `http://localhost:{8082 identity, 9000 portal, 9002 learn, 9004 challenge, 9006 community}` |
| docker (`gateway.localMode=false`) | `http://<service>:8080` |

## Non-functional

- Body buffered in memory, cap 2 MB (uploads are not a v1 feature).
- Proxy client: Spring `WebClient`; the controller blocks for the response (servlet stack).
- No rate limiting, caching or retries in v1.

## Configuration

`JWT_SECRET`, `INTERNAL_GATEWAY_SECRET`, `gateway.localMode`, `security.jwt.issuer=identity-service`.

## Tests

Unit tests for the JWT filter: valid token → attributes set; missing token → `authenticated=false`; garbage token → `authenticated=false`.

## Later

Return 401 for expired tokens on non-identity services; forward `X-User-Role`; rate limiting on `/signin`; streaming bodies.

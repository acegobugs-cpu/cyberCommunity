# Gateway Service — 2026-09-09

**Path:** `gateway/` · **Main class:** `com.cyberclub.gateway.GatewayServiceApplication` · **Status:** functional

## Purpose

Single public entry point for the backend. Resolves which downstream service a request is for, validates the caller's JWT, and forwards the request byte-for-byte with trusted internal headers added.

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 17 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-webflux` (WebClient), `spring-boot-starter-data-jpa` + `postgresql` (declared, **unused**), `hibernate-validator`, `jjwt-api/impl/jackson 0.11.5`, `spring-boot-starter-test` |
| Port | 8080 (Spring default; no `server.port` set) |
| Dockerfile | `maven:3.9.5-eclipse-temurin-17` build → `eclipse-temurin:17-jre-alpine`, `EXPOSE 8080`, `java -jar gateway.jar` |

## Configuration

`application.properties` is empty. `application-docker.properties` (active when `SPRING_PROFILES_ACTIVE=docker`):

| Key | Value |
| :-- | :-- |
| `gateway.localMode` | `false` (code default is `true`) |
| `spring.datasource.url/username/password` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}` — required so the unused JPA auto-config can start |
| `spring.datasource.driver-class-name` | `org.postgresql.Driver` |
| `security.jwt.secret` | `${JWT_SECRET}` |
| `security.jwt.issuer` | `identity-service` |
| `spring.jpa.hibernate.ddl-auto` | `none` |
| `spring.flyway.enabled` / `spring.liquibase.enabled` | `false` |
| `spring.jpa.database-platform` | `org.hibernate.dialect.PostgreSQLDialect` |

Also read directly from the environment: `INTERNAL_GATEWAY_SECRET` (`Forward` constructor, `Objects.requireNonNull`).

`JwtProperties` / `JwtConfig` bind `security.jwt.*` into a record and build an HMAC key.

## Package map

```
com.cyberclub.gateway
├── GatewayServiceApplication
├── Forward                       # WebClient proxy
├── config/JwtConfig, JwtProperties
├── filters/ServiceFilter (@Order 1), JwtFilter (@Order 2)
├── restcontroller/ProxyController  # @RequestMapping("/**")
└── tenancy/ServiceResolver
```

## Filter chain

### 1. `ServiceFilter` (`@Order(1)`, `OncePerRequestFilter`)
Calls `ServiceResolver.resolve(request)` and stores the result in request attribute `serviceName`.

`ServiceResolver` order of precedence:
1. **Host header subdomain** — strip port, lower-case; skip if IPv4 literal, IPv6 (`[`), or `localhost`; take the first label (e.g. `learn.example.com` → `learn`); must match `^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$` else `IllegalArgumentException("Invalid service identifier format")`.
2. **`X-Service-Name` header** if present and non-blank.
3. Default `"portal"`.

Errors → `400` (`IllegalStateException`, `IllegalSelectorException` "Service resolution failed", `IllegalArgumentException` with message).

### 2. `JwtFilter` (`@Order(2)`)
Reads `Authorization: Bearer <jwt>`; parses with `security.jwt.secret` and requires issuer `identity-service`. Sets request attributes:

| Attribute | Value |
| :-- | :-- |
| `authenticated` | `true` on success, `false` on any failure (missing header, bad signature, expired, wrong issuer) |
| `userId` | JWT `sub` |
| `email` | JWT `email` claim |

**Never returns 401** — failures are logged (`"JWT validation failed: {}"`) and the chain continues.

No paths are excluded from either filter.

## Routing — `ProxyController`

`@RequestMapping("/**")` — every method, every path.

1. If `authenticated != true` → `service = "identity"` (this is how unauthenticated sign-up/sign-in reach identity regardless of Host/`X-Service-Name`).
2. `service` must be in `{identity, portal, learn, challenge, community}` else `IllegalArgumentException("unidentified service")` (→ 500 by default handler).
3. Downstream base URL:

| `gateway.localMode` | URL |
| :-- | :-- |
| `true` (default) | `http://localhost:<port>` from `LOCAL_SERVICE_PORTS`: identity 8082, portal 9000, learn 9002, **challenge 9004, community 9006** |
| `false` (docker) | `http://<service>:8080` |

The compose-provided `IDENTITY_SERVICE_URL` / `LEARN_SERVICE_URL` / `PORTAL_SERVICE_URL` env vars are not read.

## Forwarding — `Forward.forward(request, downstreamUrl)`

- URL = `downstreamUrl + requestURI [+ "?" + queryString]`.
- Copies all incoming headers **except** `Authorization`, `X-User-Id`, `X-Internal-Auth`.
- Sets `X-Internal-Auth = INTERNAL_GATEWAY_SECRET`, `X-User-Id = attr userId` (may be null when unauthenticated), `X-Request-Id = UUID.randomUUID()`.
- Reads the whole body (`readAllBytes`), sends with `WebClient` (2 MB in-memory codec limit), `exchangeToMono(...).block()`.
- Response: downstream status, all downstream headers, body bytes — returned as `ResponseEntity<byte[]>`.

Not implemented: `X-User-Role` propagation, `X-Correlation-Id` (portal/learn look for this, gateway sends `X-Request-Id`), timeouts, retries, rate limiting, path exclusions (e.g. `/actuator`).

## Endpoints

| Method | Path | Auth | Behavior |
| :-- | :-- | :-- | :-- |
| ANY | `/**` | JWT optional | Proxy as described above |

## Tests

`gateway/src/test/java/com/cyberclub/gateway/auth/JwtFilterTest.java`

| Test | Asserts |
| :-- | :-- |
| `shouldAuthenticateValidToken` | valid HS256 token → `authenticated=true`, `userId="user-123"`, `email="user@test.com"` |
| `shouldRejectMissingToken` | no header → `authenticated=false` |
| `shouldRejectInvalidToken` | `Bearer token` → `authenticated=false` |

## Observations

- `spring-boot-starter-data-jpa` + PostgreSQL are required only to satisfy auto-configuration; the gateway performs no DB access.
- `.block()` inside a servlet controller makes the WebFlux dependency purely a client convenience (task.txt: "webflux and starter-web conflicting").
- Local port map for community/challenge is inverted relative to those services' `server.port` — see [../gaps.md](../gaps.md).
- `X-User-Id` header is set to `null` string when unauthenticated (WebClient `headers.set(name, null)` removes it — effectively absent).

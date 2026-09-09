# Implementation — Security Model

**Level 3** · mechanics behind AD-2 … AD-5

## 1. Secrets

| Secret | Holder(s) | Constraint |
| :-- | :-- | :-- |
| `JWT_SECRET` | identity (sign), gateway (verify) | ≥ 32 chars; identity refuses to start otherwise |
| `INTERNAL_GATEWAY_SECRET` | gateway (send), every service (verify), services (send to identity) | any string; compared with `MessageDigest.isEqual` |
| BCrypt hashes | identity DB only | strength 12 |

## 2. Token format

```
Header  : { "alg": "HS256", "typ": "JWT" }
Payload : { "sub": "<user uuid>", "email": "<email>", "iss": "identity-service", "iat": <epoch>, "exp": <iat + 900> }
```
Lifetime 15 minutes. No refresh token in v1; the frontend re-authenticates.

## 3. Header contract (internal network)

| Header | Set by | Read by | Meaning |
| :-- | :-- | :-- | :-- |
| `X-Internal-Auth` | gateway; services when calling identity | every service | "this request came from inside" |
| `X-User-Id` | gateway | every service | authenticated caller's UUID; absent for anonymous |
| `X-Request-Id` | gateway | logs | per-hop request id |
| `X-Correlation-Id` | client or service | portal/learn `CorrelationFilter` | validated `^[a-zA-Z0-9\-_]+$`, ≤ 64, else regenerated; echoed on response |
| `X-Service-Name` | frontend BFF | gateway | routing hint when no subdomain |

Clients cannot spoof `X-User-Id`/`X-Internal-Auth`: the gateway strips them before adding its own.

## 4. Service filter chain (servlet filters registered via `FilterRegistrationBean`)

| Order | Filter | On failure |
| :-- | :-- | :-- |
| `HIGHEST_PRECEDENCE` | `GatewayTrustFilter` — `X-Internal-Auth` must equal secret | `401 {"error":"unauthorized","message":"Gateway validation required"}` |
| `HIGHEST_PRECEDENCE + 10` | `JwtFilter` (naming kept from the first draft; it reads `X-User-Id`, not a JWT) — bind to `UserContext` | portal: `401 "userId missing"`; learn/community/challenge: continue anonymous |
| component | `CorrelationFilter` — bind `TraceContext`, echo header | never fails |

Both contexts are `ThreadLocal`s and **must** be cleared in `finally`.

Identity uses the same trust filter (`InternalAuthFilter`) at highest precedence and nothing else.

## 5. Authorization inside a service

```
AuthService.require(policy)
  ├─ userId = UserContext.get()                       // from X-User-Id
  ├─ result = ClientAuth.checkMembership(userId)      // GET identity /private/api/member/check?userId&serviceName=<me>
  │      200 → AuthResult{allowed, role}
  │      401 → UnauthorizedException, 403 → ForbiddenException, 404 → NotFoundException, 5xx → RuntimeException
  └─ policy.check(result)                             // throws ForbiddenException("Unauthorized Access")
```

```java
interface AuthPolicy { void check(AuthResult r); default AuthPolicy and(AuthPolicy o) {…} default AuthPolicy or(AuthPolicy o) {…} }
Policies.MEMBER  → role == "USER"
Policies.ADMIN   → role == "ADMIN"
```

Usage in a service method: `auth.require(Policies.MEMBER.or(Policies.ADMIN));`

Outbound `WebClient` to identity is built once per service with an `ExchangeFilterFunction` (`InternalAuthFilter`) that adds `X-Internal-Auth`.

## 6. Roles and how they are granted

- On `/signup`, identity inserts `memberships(role='USER')` for every row in `services`.
- `ADMIN` is granted by operators directly in the database in v1 (`UPDATE identity.memberships SET role='ADMIN' WHERE …`). An admin endpoint is v2.

## 7. Threat model notes (v1)

- Services are reachable only on the Compose network / localhost; the shared secret defends against a misconfigured public port, not against a compromised host.
- The gateway never rejects; identity and services return 401/403. Consequence: an expired token on `/users` is answered by identity (404/405), not by portal — acceptable for v1, revisit.
- No rate limiting on `/signin`; add before public exposure.
- Passwords: no complexity policy in v1; BCrypt cost 12.

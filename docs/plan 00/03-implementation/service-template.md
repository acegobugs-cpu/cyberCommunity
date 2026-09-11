# Implementation — Service Template

**Level 3** · what every domain service (portal, learn, community, challenge) must look like. Portal is the reference; the others copy it and delete what they do not need yet.

## 1. Module layout

```
<service>/
├── pom.xml            # Spring Boot 3.5.9 parent, own artifact, no shared parent
├── mvnw, mvnw.cmd, .mvn/
├── Dockerfile         # multi-stage, EXPOSE 8080, java -jar <service>.jar
├── README.md          # what the service owns + endpoints
└── src/main/java/com/cyberclub/<service>/
    ├── <Service>ServiceApplication.java
    ├── config/
    │   ├── DataSourceConfig.java     # builds pool, wraps in ServiceDataSource
    │   ├── UserConfig.java           # FilterRegistrationBeans with explicit order
    │   └── WebClientConfig.java      # identityWebClient (base-url + InternalAuthFilter)
    ├── context/
    │   ├── UserContext.java          # ThreadLocal<String userId>: set/get/isSet/clear
    │   └── TraceContext.java         # ThreadLocal<String correlationId>
    ├── datasource/ServiceDataSource.java   # SET search_path TO "<schema>", public
    ├── filters/
    │   ├── GatewayTrustFilter.java   # X-Internal-Auth check (HIGHEST_PRECEDENCE)
    │   ├── JwtFilter.java            # X-User-Id → UserContext (HIGHEST_PRECEDENCE + 10)
    │   ├── CorrelationFilter.java    # X-Correlation-Id → TraceContext
    │   └── InternalAuthFilter.java   # ExchangeFilterFunction: add X-Internal-Auth to outbound calls
    ├── security/
    │   ├── AuthPolicy.java, Policies.java, ClientAuth.java, (dto) AuthResult.java
    ├── dtos/                          # Java records mirrored 1:1 in frontend/src/lib/types.ts
    ├── exceptions/
    │   ├── RequestException (abstract), BadRequestException, UnauthorizedException,
    │   │   ForbiddenException, NotFoundException
    ├── repositories/                  # JdbcTemplate
    ├── services/                      # business logic; call auth.require(...) first
    └── restcontrollers/ (or graphql/)
        └── ControllerExceptionHandler.java  # @RestControllerAdvice → ErrorResponse
```

## 2. Configuration files

`src/main/resources/application.properties` (local defaults):
```properties
server.port=<9000|9002|9004|9006>
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=none
spring.flyway.enabled=false
spring.liquibase.enabled=false
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
identity.base-url=http://localhost:8082
```
`application-docker.properties` — same, with `server.port=` unset (→ 8080) and `identity.base-url=http://identity:8080`. Activated by `SPRING_PROFILES_ACTIVE=docker`.

Env vars every service needs: `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `INTERNAL_GATEWAY_SECRET`.

## 3. Request handling rules

1. Controllers are thin: bind request → call service → return DTO. No auth logic in controllers.
2. Every service method that exposes data starts with `auth.require(<policy>)`.
3. Never read headers in services; use `UserContext.get()` / `TraceContext.getCorrelationId()`.
4. Filters that set a ThreadLocal clear it in `finally`.
5. Throw the typed exceptions; let `ControllerExceptionHandler` map them.

## 4. Error body

```json
{ "error": "FORBIDDEN", "message": "Unauthorized Access", "path": "/users", "correlationId": "…", "timestamp": "2026-…Z" }
```
Mapping: `BadRequest→400`, `Unauthorized→401`, `Forbidden→403`, `NotFound→404`, `DataAccessException→503 "database is not available"`, `Exception→500 "internal server error"` (never leak internals).

## 5. Ports

| Service | local `server.port` | container | gateway local map |
| :-- | :-- | :-- | :-- |
| identity | 8082 | 8080 | 8082 |
| portal | 9000 | 8080 | 9000 |
| learn | 9002 | 8080 | 9002 |
| community | 9004 | 8080 | 9004 |
| challenge | 9006 | 8080 | 9006 |

The gateway's `LOCAL_SERVICE_PORTS` map **must** stay in sync with this table.

## 6. Skeleton stage (community, challenge in v1)

A skeleton keeps: application class, `DataSourceConfig` + datasource wrapper, `UserConfig` + `JwtFilter` + `UserContext`, properties files, Dockerfile, an empty `@SpringBootTest`. It adds `GatewayTrustFilter`, `CorrelationFilter`, `WebClientConfig`, security package and exception handler **with its first real endpoint**.

## 7. Definition of done for a new endpoint

- Policy declared in the service method.
- DTO record + matching TypeScript type.
- Integration test on Testcontainers covering allowed role, forbidden role, and identity-unavailable.
- README endpoint table updated.

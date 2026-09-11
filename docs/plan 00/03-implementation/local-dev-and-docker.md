# Implementation — Local Development & Docker

**Level 3** · how a contributor runs the platform

## 1. Two supported modes

| Mode | DB | Services | Frontend | When |
| :-- | :-- | :-- | :-- | :-- |
| **Compose** | `postgres` container, host port 5432 | containers running `./mvnw spring-boot:run` from bind-mounted source | `npm run dev` on the host | default; zero JDK setup |
| **Local JVMs** | any Postgres on host port `LOCAL_DB_PORT` (5433) | `make start` → background JVMs, logs in `logs/<svc>.log` | `npm run dev` | fast iteration on one service |

Both share `.env` at the repo root (git-ignored).

## 2. `.env` contract

```dotenv
POSTGRES_USER=appuser_dev
POSTGRES_PASSWORD=dev_secure_password
POSTGRES_DB=multi_service_db
POSTGRES_URL=jdbc:postgresql://postgres:5432/multi_service_db?user=appuser_dev&password=dev_secure_password   # compose → DATABASE_URL
DATABASE_URL=jdbc:postgresql://localhost:5433/multi_service_db                                                # local JVMs
LOCAL_DB_PORT=5433
DOCKER_DB_PORT=5432
JWT_SECRET=<≥32 random chars>
INTERNAL_GATEWAY_SECRET=<random string>
```

## 3. Docker Compose design

- **Source-mounted dev containers**: each service uses the `maven:3.9.5-eclipse-temurin-<jdk>` image, `working_dir: /app`, `volumes: ./<svc>:/app` and a shared `maven-repo:/root/.m2` cache. Code changes only need a container restart, not an image build. The JDK tag must match the service's `pom.xml` (`21` for identity/portal/learn, `17` for the rest).
- **Postgres** with healthcheck `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`; data in `pgdata` volume.
- **Migration jobs** `migrate-identity`, `migrate-portal`, `migrate-learn`: `flyway/flyway:11`, mount `./infra/migrations/<schema>:/flyway/sql`, command `-schemas=<schema> -table=<schema>_schema_history -locations=filesystem:/flyway/sql migrate`, `depends_on: postgres: service_healthy`.
- **Ordering**: identity/portal/learn `depends_on` their migration job with `condition: service_completed_successfully`; gateway has no DB dependency at start.
- **Ports** published host→container: gateway `8080:8080`, identity `8082:8080`, portal `9000:8080`, learn `9002:8080`, community `9004:8080`, challenge `9006:8080`, postgres `5432:5432`.
- **Env** per service: `SPRING_PROFILES_ACTIVE=docker`, `DATABASE_URL=${POSTGRES_URL}`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, plus `INTERNAL_GATEWAY_SECRET` where the trust filter exists and `JWT_SECRET` for identity/gateway.
- Network `app-network` (bridge). Frontend is **not** containerised in v1.

Verifying migrations: `docker logs migrate-identity`, then `psql … -c '\dn' -c '\dt identity.*'` (tables are in per-service schemas, so a bare `\dt` shows nothing).

## 4. Makefile

```
JAVA_SERVICES = identity gateway portal learn community challenge
SCHEMAS       = identity portal learn community challenge
FLYWAY        = ./tools/flyway/flyway
SS ?= $(JAVA_SERVICES)          # override: make start SS="identity portal"
```
| Target | Behaviour |
| :-- | :-- |
| `start` | wait for Postgres (`pg_isready -h localhost -p $(LOCAL_DB_PORT)`), migrate each schema with the Flyway CLI, start each service in `SS` with env from `.env`, redirect to `logs/<svc>.log` |
| `test` | `./mvnw test` per service in `SS`, same env, logs to `logs/` |
| `stop` / `restart` / `status` | `pkill -f "<svc>/target/.*spring-boot"`; `ps aux | grep spring` |

`tools/flyway/` holds the vendored Flyway 11 CLI (git-ignored; download on first setup).

## 5. `infra/start-app.sh`

Single-command alternative with hard-coded dev values: export env → wait for Postgres on 5433 → render `infra/flyway.conf.template` per schema and migrate → `./mvnw spring-boot:run &` for all six services.

## 6. Frontend

```bash
cd frontend && npm install && npm run dev      # http://localhost:3000
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080  # default
```
Subdomains locally: `portal.localhost:3000`, `community.localhost:3000`, … (listed in `allowedDevOrigins`).

## 7. Smoke test after bring-up

1. `POST http://localhost:8080/signup` with `X-Service-Name: identity` → 201 + token.
2. `GET http://localhost:8080/portal/info` with `Authorization: Bearer <token>`, `X-Service-Name: portal` → 200 `{role:"USER"}`.
3. Open `http://localhost:3000/signup` in a browser, register, land on `/dashboard`.

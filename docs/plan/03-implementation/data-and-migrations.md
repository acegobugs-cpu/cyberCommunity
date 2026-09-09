# Implementation — Data & Migrations

**Level 3** · mechanics behind AD-1, AD-6, AD-7

## 1. Database layout

One PostgreSQL 16 database `multi_service_db`, one role `appuser_dev` (owner of everything in dev), five schemas:

| Schema | Owner service | v1 tables |
| :-- | :-- | :-- |
| `identity` | identity | `users`, `services`, `memberships` |
| `portal` | portal | `user_setting` |
| `learn` | learn | `courses`, `lessons` |
| `community` | community | — (v2) |
| `challenge` | challenge | — (v2) |

Rules:
- A service's SQL references only its own schema. Identity fully qualifies (`identity.users`); the others rely on `search_path`.
- No foreign keys across schemas. Cross-schema references are plain UUID columns (e.g. `portal.user_setting.user_id`).
- `public` stays empty.

## 2. Pinning a service to its schema

Each service wraps the pooled `DataSource` (`ServiceDataSource` / `TenantDataSource`) and on every `getConnection()` runs

```sql
SET search_path TO "<schema>", public
```
failing closed (close connection, rethrow) if that statement fails. `DataSourceConfig` builds the pool from `spring.datasource.*` and exposes the wrapper as the primary `DataSource` so `JdbcTemplate` and `@Transactional` use it transparently.

## 3. Flyway conventions

- Location: `infra/migrations/<schema>/V<N>__<snake_description>.sql`.
- Each run targets exactly one schema: `-schemas=<schema>` and its own history table `-table=<schema>_schema_history` (Compose) or the default `flyway_schema_history` inside the schema (CLI). Never run one Flyway invocation across two schemas.
- `V1` of every schema begins with `CREATE SCHEMA IF NOT EXISTS <schema>; SET search_path TO <schema>;` so migrations are self-sufficient even when Flyway does not create the schema.
- Applications never run Flyway: `spring.flyway.enabled=false`, `spring.jpa.hibernate.ddl-auto=none`. Tests are the exception — they import a `TestFlywayConfig` pointing at `filesystem:../infra/migrations/<schema>` against a Testcontainers database.
- `infra/flyway.conf.template` with a `{schema}` placeholder is the single source for CLI runs; per-schema `.conf` files may be checked in for convenience (`flyway-identity.conf`, `flyway-portal.conf`).

## 4. Initial DDL

### identity
```sql
-- V1__init_identity_schema.sql
CREATE SCHEMA IF NOT EXISTS identity;  SET search_path TO identity;
CREATE TABLE users (
  id UUID PRIMARY KEY, username VARCHAR(255), email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE INDEX idx_users_email ON users (email);

-- V2__identity_model_core.sql
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY, service_name VARCHAR(100) NOT NULL UNIQUE, created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY, user_id UUID NOT NULL, service_id UUID NOT NULL, role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_membership_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT uq_membership UNIQUE (user_id, service_id));

-- V3__identity_populate_services.sql
INSERT INTO services (id, service_name) VALUES
  (gen_random_uuid(),'portal'), (gen_random_uuid(),'community'),
  (gen_random_uuid(),'challenge'), (gen_random_uuid(),'learn');
```

### portal
```sql
-- V1__init_portal_schema.sql
CREATE SCHEMA IF NOT EXISTS portal;  SET search_path TO portal;
CREATE TABLE user_setting (
  user_id UUID PRIMARY KEY, theme TEXT NOT NULL, notifications_enabled BOOLEAN NOT NULL,
  language_code TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP);
```

### learn
```sql
-- V1__learn_course_relation.sql
CREATE SCHEMA IF NOT EXISTS learn;  SET search_path TO learn;
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(255) NOT NULL, description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), course_id UUID NOT NULL, title VARCHAR(255) NOT NULL,
  content TEXT, order_index INT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_lesson_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE);
CREATE INDEX idx_lesson_course_id ON lessons(course_id);
```

## 5. Data access style

- `JdbcTemplate` repositories, one class per aggregate (`UserRepo`, `MembershipRepo`, `CourseRepo`, …).
- Records for DTOs; `RowMapper` lambdas inline.
- UUIDs generated in Java (`UUID.randomUUID()`) for identity tables, in SQL (`gen_random_uuid()` default) for learn.
- Upserts with `INSERT … ON CONFLICT (…) DO UPDATE` (portal settings).
- Write methods `@Transactional` at the service layer.

## 6. Running migrations

| Context | Command |
| :-- | :-- |
| Compose | one-shot `migrate-<schema>` containers; services `depends_on: condition: service_completed_successfully` |
| Local JVMs | `make start` → loops `SCHEMAS` with `tools/flyway/flyway -schemas=<s> -locations=filesystem:infra/migrations/<s> migrate` |
| Script | `infra/start-app.sh` renders `flyway.conf.template` per schema |
| Tests | `TestFlywayConfig` bean, `createSchemas=true` |

Only schemas that have a migrations folder get a Compose job; add `migrate-community` / `migrate-challenge` together with their `V1`.

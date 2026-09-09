# Learn Service — 2026-09-09

**Path:** `learn/` · **Main class:** `com.cyberclub.learn.LearnServiceApplication` · **Status:** functional GraphQL CRUD, no authorization, no tests

## Purpose

Course and lesson catalogue exposed over GraphQL (`POST /graphql`, GraphiQL UI at `/graphiql`). No progress tracking, quizzes or enrolment exist.

## Build

| Item | Value |
| :-- | :-- |
| Spring Boot | 3.5.9 |
| Java | 21 |
| Dependencies | `spring-boot-starter-web`, `spring-boot-starter-webflux`, `spring-boot-starter-data-jpa`, `spring-boot-starter-graphql`, `postgresql` |
| Port | `9002` locally; docker profile `server.port=` empty → 8080 |
| Dockerfile | `maven:3.9.5-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`, `EXPOSE 8080`, `learn.jar` (compose, however, runs it with the **temurin-17** Maven image) |
| Tests | **none** (`learn/src/test` does not exist) |

## Configuration

| Key | `application.properties` | `application-docker.properties` |
| :-- | :-- | :-- |
| `server.port` | `9002` | (empty) |
| `spring.datasource.*` | `${DATABASE_URL}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `org.postgresql.Driver` | same |
| `spring.jpa.hibernate.ddl-auto` | `none` | `none` |
| `spring.flyway.enabled`, `spring.liquibase.enabled` | `false` | `false` |
| `spring.jpa.database-platform` | `PostgreSQLDialect` | same |
| `identity.base-url` | `http://localhost:8082` | `http://identity:8080` |
| `spring.graphql.graphiql.enabled` | `true` | `true` |

Env read directly: `INTERNAL_GATEWAY_SECRET` (`GatewayTrustFilter`, `InternalAuthFilter`).

## Package map

```
com.cyberclub.learn
├── LearnServiceApplication
├── config/DataSourceConfig, UserConfig, WebClientConfig
├── context/UserContext, TraceContext
├── datasource/ServiceDataSource                 # SET search_path TO "learn", public
├── dtos/Course(id, title, description, createdAt), Lesson(id, courseId, title, content, orderIndex)
├── filters/GatewayTrustFilter, JwtFilter, CorrelationFilter, InternalAuthFilter
├── graphql/CourseQueryResolver, LessonQueryResolver
├── repositories/CourseRepo, LessonRepo          # JdbcTemplate
└── services/CourseSerivce (sic), LessonService
```

## Filter chain (`UserConfig`)

| Order | Filter | Behavior |
| :-- | :-- | :-- |
| `HIGHEST_PRECEDENCE` | `GatewayTrustFilter` | same as portal: `X-Internal-Auth` must equal secret else 401 JSON |
| `HIGHEST_PRECEDENCE + 10` | `JwtFilter` | reads `X-User-Id`; if present → `UserContext.setUserId`; **does not reject when absent**; cleared in `finally` |
| component | `CorrelationFilter` | identical to portal (`X-Correlation-Id` validate/generate/echo) |

`InternalAuthFilter` + `WebClientConfig` create an identity `WebClient` with `X-Internal-Auth`, but **nothing in learn calls identity**. `UserContext` is set but never read.

## GraphQL schema (`src/main/resources/graphql/schema.graphqls`)

```graphql
type Course  { id: ID!  title: String!  description: String  createdAt: String!  lessons: [Lesson!]! }
type Lesson  { id: ID!  courseId: ID!  title: String!  content: String  orderIndex: Int! }

type Query {
  courses: [Course!]!
  course(id: ID!): Course
}

type Mutation {
  createCourse(title: String!, description: String): Course!
  createLesson(courseId: ID!, title: String!, content: String, orderIndex: Int!): Lesson!
}
```

## Resolvers

| Operation | Class / method | Service call |
| :-- | :-- | :-- |
| `Query.courses` | `CourseQueryResolver.courses()` (`@QueryMapping`) | `CourseSerivce.getCourses()` |
| `Query.course(id)` | `CourseQueryResolver.course(@Argument UUID id)` | `CourseSerivce.getCourse(id)` (returns `null` if absent) |
| `Mutation.createCourse` | `CourseQueryResolver.createCourse(title, description)` (`@MutationMapping`) | `CourseSerivce.createCourse` (`@Transactional`) |
| `Course.lessons` | `LessonQueryResolver.lessons(Course)` (`@SchemaMapping(typeName="Course", field="lessons")`) | `LessonService.getLessonsForCourses(course.id)` — N+1 (one query per course) |
| `Mutation.createLesson` | `LessonQueryResolver.createLesson(courseId, title, content, orderIndex)` | `LessonService.createLesson` |

There is **no authorization** on any operation — any request that carries the gateway secret can read and create.

## Repositories (JdbcTemplate, unqualified table names resolved through `search_path=learn`)

| Method | SQL |
| :-- | :-- |
| `CourseRepo.courses()` | `SELECT id, title, description, created_at FROM courses ORDER BY created_at DESC` |
| `CourseRepo.course(id)` | `SELECT id, title, description, created_at FROM courses WHERE id = ?` |
| `CourseRepo.save(title, description)` | `INSERT INTO courses (title, description, created_at) VALUES (?, ?, now()) RETURNING id, title, description, created_at` |
| `LessonRepo.findByCourseId(id)` | `SELECT id, course_id, title, content, order_index FROM lessons WHERE course_id=? ORDER BY order_index ASC` |
| `LessonRepo.save(courseId, title, content, orderIndex)` | `INSERT INTO lessons (course_id, title, content, order_index, created_at) VALUES (?,?,?,?, now()) RETURNING id, course_id, title, content, order_index, created_at` |

## Data (schema `learn`)

`courses(id UUID PK default gen_random_uuid(), title, description, created_at)`, `lessons(id, course_id → courses ON DELETE CASCADE, title, content, order_index, created_at)` + index `idx_lesson_course_id`. See [../infra.md](../infra.md).

## Reaching it

Through the gateway: `POST http://localhost:8080/graphql` with `Authorization: Bearer <jwt>` and either `Host: learn.<domain>` or `X-Service-Name: learn`. Without a valid JWT the gateway reroutes to identity, so a token is effectively required even though learn itself does not check it.

## Observations

- `CourseSerivce` is misspelled.
- No error handling (`DataAccessException`, invalid UUID) → default GraphQL `INTERNAL_ERROR`.
- No update/delete operations; no enrolment, progress, quizzes (README claims these).
- Frontend `/learn` page does not call this API — it renders a static list.
- Java version mismatch between Dockerfile (21) and compose image (17); `pom.xml` targets 21, so `./mvnw spring-boot:run` under the compose image will fail to compile unless the toolchain is available.

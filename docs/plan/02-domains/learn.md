# Domain — Learn

**Level 2** · schema `learn` · first **GraphQL** service

## Responsibility

Structured learning content: a course is an ordered list of lessons. v1 is the content model and API only; progress, quizzes and enrolment come later.

## Why GraphQL here

The Learn UI needs nested reads (course → lessons) with variable depth and will grow many optional fields. One GraphQL endpoint avoids a proliferation of REST shapes. Spring for GraphQL keeps it inside the same Spring Boot service template; GraphiQL is enabled for development.

## Domain model

```
courses(id UUID PK default gen_random_uuid(), title VARCHAR(255) NOT NULL, description TEXT, created_at)
lessons(id UUID PK default gen_random_uuid(), course_id → courses ON DELETE CASCADE, title, content TEXT, order_index INT NOT NULL, created_at)
index on lessons(course_id)
```

## Schema (`schema.graphqls`)

```graphql
type Course { id: ID! title: String! description: String createdAt: String! lessons: [Lesson!]! }
type Lesson { id: ID! courseId: ID! title: String! content: String orderIndex: Int! }

type Query {
  courses: [Course!]!
  course(id: ID!): Course
}
type Mutation {
  createCourse(title: String!, description: String): Course!
  createLesson(courseId: ID!, title: String!, content: String, orderIndex: Int!): Lesson!
}
```

Resolvers: `@QueryMapping courses/course`, `@MutationMapping createCourse/createLesson`, `@SchemaMapping(Course.lessons)` loading lessons per course ordered by `order_index`.

## Security (v1)

Runs the standard filter chain (gateway trust + user context + correlation). **No per-operation authorization in v1** — the gateway already requires a valid JWT to reach any non-identity service; role checks (`ADMIN` for mutations) are v2.

## Configuration

Standard service vars + `identity.base-url`, `spring.graphql.graphiql.enabled=true`, `server.port=9002`.

## Tests

v1 ships without tests (content-only, no rules); add GraphQL slice tests in v2 together with authorization.

## Later

Mutations gated by `ADMIN`; update/delete; enrolment + `progress(user_id, lesson_id, completed_at)`; quizzes; batch-load lessons to avoid N+1.

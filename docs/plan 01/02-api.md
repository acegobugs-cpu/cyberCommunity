# Level 2 — API (Learn)

## 1. API style decision

| Surface | Style | Why |
| :-- | :-- | :-- |
| Learner + author operations (everything the frontend calls) | **GraphQL** at `POST /graphql` (inherited from Plan 00) | Deeply nested reads (roadmap → courses → modules → lessons → my progress) with per-screen field selection; one BFF route; schema doubles as the frontend type contract via codegen |
| Learn → lab-runner | **REST** (`lab-runner` is Go, internal only) | Simple imperative lifecycle (`create / get / delete instance`); no nesting; language-neutral |
| lab-runner → Learn callbacks | **REST** `POST /internal/lab-sessions/{id}/events` | Same reason; carries `X-Internal-Auth` |
| Identity lookups | existing REST `/private/api/**` | Plan 00 contract |

Rejected: REST for the learner API (would need ~25 endpoints and N+1 round trips from the browser); GraphQL subscriptions for lab status (polling every 3 s is enough at club scale; revisit with the real-time hub).

## 2. Authorization

Every resolver's service method starts with `auth.require(...)` exactly as in Portal (`AuthService` → identity `member/check?serviceName=learn` → `Policies`). Two policies suffice:

| Policy | Role | Applies to |
| :-- | :-- | :-- |
| `LEARNER` = `MEMBER.or(ADMIN)` | `USER` or `ADMIN` | all queries; enroll/complete/attempt/submit/start-lab/submit-flag mutations |
| `AUTHOR` = `ADMIN` | `ADMIN` | create/update/publish/archive content (incl. lesson doc trees, quizzes, labs, exercises); `adminLabSessions` |

Visibility rule enforced in repositories, not resolvers: learner queries always add `published = true`; author queries pass `includeUnpublished = true`. Ownership rule: learner mutations operate on `UserContext.get()` only — there is no `userId` argument on them.

**Errors:** a `DataFetcherExceptionResolverAdapter` maps `ForbiddenException → FORBIDDEN`, `NotFoundException → NOT_FOUND`, `BadRequestException → BAD_REQUEST`, `UnauthorizedException → UNAUTHORIZED`, everything else → `INTERNAL_ERROR` with the message hidden. `extensions` carry `{ correlationId }` (= `X-Request-Id`).

## 3. GraphQL schema (target at end of Plan 01)

```graphql
scalar DateTime
scalar JSON

enum Difficulty { BEGINNER INTERMEDIATE ADVANCED }
enum LessonType { READING VIDEO QUIZ LAB PROJECT }
enum ProgressStatus { NOT_STARTED STARTED COMPLETED }
enum LabSessionStatus { STARTING RUNNING STOPPED EXPIRED FAILED }
enum QuestionKind { SINGLE MULTI }
enum LessonDocKind { DOC VIDEO }                       # folder tree of material on any lesson (2026-09-21)
enum Verdict { PASS FAIL ERROR TIMEOUT }               # exercises (L7)

# ---------- content ----------
type Roadmap {
  id: ID! slug: String! title: String! descriptionMd: String
  difficulty: Difficulty! published: Boolean!
  items: [RoadmapItem!]!
  progress: Float            # 0..1 for the caller, null if not enrolled in any item
}
type RoadmapItem { position: Int! required: Boolean! course: Course! }

type Course {
  id: ID! slug: String! title: String! description: String
  difficulty: Difficulty! tags: [String!]! published: Boolean!
  estimatedMinutes: Int! createdAt: DateTime!
  modules: [Module!]!
  enrollment: Enrollment      # caller's, null if none
  progress: Float!            # 0..1 for the caller
}
type Module { id: ID! title: String! descriptionMd: String position: Int! lessons: [Lesson!]! }

type Lesson {
  id: ID! title: String! type: LessonType! position: Int! estimatedMinutes: Int
  contentMd: String videoUrl: String
  docs: [LessonDoc!]!         # optional folder tree (spec files, tutorial videos); UI folds `path` into folders
  quiz: Quiz lab: Lab exercise: Exercise   # PROJECT lessons carry nothing extra: build it yourself, mark it done
  myProgress: ProgressStatus!
}
type LessonDoc { id: ID! path: String! kind: LessonDocKind! title: String! contentMd: String videoUrl: String position: Int! }

type Quiz { id: ID! passScore: Int! questions: [Question!]! myBestAttempt: QuizAttempt }
type Question { id: ID! position: Int! promptMd: String! kind: QuestionKind! points: Int! options: [Option!]! }
type Option { id: ID! position: Int! textMd: String! }          # no `correct` field for learners
type QuizAttempt { id: ID! score: Int! passed: Boolean! submittedAt: DateTime! }

type Lab {
  id: ID! title: String! briefMd: String! ttlMinutes: Int! exposedPort: Int!
  tasks: [LabTask!]!
  mySession: LabSession       # active STARTING/RUNNING session or null
  myCompletedTaskIds: [ID!]!
}
type LabTask { id: ID! position: Int! promptMd: String! points: Int! required: Boolean! }
type LabSession { id: ID! status: LabSessionStatus! endpoint: String expiresAt: DateTime failReason: String }

# exercises (L7): code workspace graded by the club's tests via the judge
type Exercise { id: ID! language: String! editableFiles: [String!]! tasks: [ExerciseTask!]! myWorkspace: ExerciseWorkspace myRuns: [ExerciseRun!]! }
type ExerciseTask { id: ID! position: Int! promptMd: String! points: Int! required: Boolean! requiresPrevious: Boolean! myBest: Verdict }   # testSelector never exposed
type ExerciseWorkspace { files: JSON! updatedAt: DateTime! }
type ExerciseRun { id: ID! taskId: ID! verdict: Verdict! output: String! ranAt: DateTime! }
type UserRef { id: ID! username: String! }

type Enrollment { enrolledAt: DateTime! completedAt: DateTime }

# ---------- queries ----------
type Query {
  roadmaps(difficulty: Difficulty): [Roadmap!]!
  roadmap(slug: String!): Roadmap
  courses(difficulty: Difficulty, tag: String, search: String): [Course!]!
  course(slug: String!): Course
  lesson(id: ID!): Lesson
  myEnrollments: [Course!]!

  # AUTHOR
  adminLabSessions(status: LabSessionStatus): [AdminLabSession!]!
}
type AdminLabSession { session: LabSession! lab: Lab! user: UserRef! startedAt: DateTime! }

# ---------- learner mutations (LEARNER) ----------
type Mutation {
  enroll(courseId: ID!): Enrollment!
  completeLesson(lessonId: ID!): Lesson!                 # READING / VIDEO / PROJECT (self-attested)
  submitQuiz(quizId: ID!, answers: [AnswerInput!]!): QuizAttempt!
  startLab(labId: ID!): LabSession!
  stopLab(sessionId: ID!): LabSession!
  submitFlag(sessionId: ID!, taskId: ID!, flag: String!): FlagResult!
  saveExerciseWorkspace(exerciseId: ID!, files: JSON!): ExerciseWorkspace!   # L7
  runExerciseTask(taskId: ID!): ExerciseRun!                                  # L7 → judge

  # ---------- author mutations (AUTHOR) ----------
  upsertRoadmap(input: RoadmapInput!): Roadmap!
  setRoadmapItems(roadmapId: ID!, items: [RoadmapItemInput!]!): Roadmap!
  upsertCourse(input: CourseInput!): Course!
  upsertModule(input: ModuleInput!): Module!
  upsertLesson(input: LessonInput!): Lesson!
  setLessonDocs(lessonId: ID!, docs: [LessonDocInput!]!): Lesson!   # replace-all folder tree; { path, kind, title, contentMd, videoUrl }
  reorder(parentId: ID!, kind: ReorderKind!, orderedIds: [ID!]!): Boolean!
  upsertQuiz(input: QuizInput!): Quiz!                   # questions + options in one payload
  upsertLab(input: LabInput!): Lab!                      # tasks with plaintext flags → hashed server-side
  upsertExercise(input: ExerciseInput!): Exercise!       # L7: template ref, editable files, tasks with test selectors
  publish(kind: PublishKind!, id: ID!, published: Boolean!): Boolean!
  adminStopLab(sessionId: ID!): LabSession!
}

input AnswerInput { questionId: ID! optionIds: [ID!]! }
type FlagResult { correct: Boolean! taskId: ID! labComplete: Boolean! lessonProgress: ProgressStatus! }
enum ReorderKind { ROADMAP_ITEMS MODULES LESSONS QUESTIONS TASKS }
enum PublishKind { ROADMAP COURSE }
# *Input types mirror the tables in 01-domain-model.md; `id` optional → insert, present → update.*
```

Plan 00's `createCourse` / `createLesson` are removed in L1 (breaking change; the only caller is GraphiQL).

## 4. Resolver conventions

- One `@Controller` per aggregate (`RoadmapResolver`, `CourseResolver`, `LessonResolver` (incl. `docs`), `QuizResolver`, `LabResolver`, `ExerciseResolver`, `AdminResolver`).
- Nested lists use `@BatchMapping` (Spring for GraphQL's DataLoader) — `Course.modules`, `Module.lessons`, `Lesson.myProgress`, `Roadmap.items` — to remove the N+1 the baseline has.
- Caller-specific fields (`progress`, `myProgress`, `mySession`, `enrollment`) read `UserContext.get()`; they are `null`/`NOT_STARTED` for authors previewing.
- Inputs validated with `jakarta.validation` on input records; `BadRequestException` on violation.
- GraphiQL stays enabled in `application.properties` (local) and is **disabled** in the `docker` profile from L0 on.

## 5. Internal REST (Learn ⇄ lab-runner)

All calls carry `X-Internal-Auth`. Runner base URL: `labrunner.base-url` (`http://localhost:9010` local, `http://lab-runner:8080` docker).

| Direction | Endpoint | Body / result |
| :-- | :-- | :-- |
| Learn → runner | `POST /instances` | `{ "sessionId", "image", "exposedPort", "ttlSeconds", "cpuMillis", "memoryMb", "env": {"FLAG_1": "…"}, "labels": {"owner":"learn","userId":"…"} }` → `201 { "instanceId", "endpoint": "host:port", "expiresAt" }` |
| Learn → runner | `GET /instances/{instanceId}` | `200 { status: STARTING\|RUNNING\|STOPPED\|FAILED, endpoint, expiresAt, failReason }` · `404` |
| Learn → runner | `DELETE /instances/{instanceId}` | `204`; idempotent |
| runner → Learn | `POST /internal/lab-sessions/{sessionId}/events` | `{ "instanceId", "status", "endpoint", "failReason", "at" }` — runner pushes `RUNNING`, `EXPIRED`, `FAILED`; Learn also polls `GET` as a fallback |
| Learn (ops) | `GET /internal/lab-sessions?status=RUNNING` | list for operators; `AUTHOR` GraphQL `adminLabSessions` wraps it |

Learn owns the session record and the user↔lab meaning; the runner owns only container lifecycle (see [04-labs-and-runner.md](04-labs-and-runner.md)).

## 6. Identity needs surfaced by this plan

- `UserRef` resolution requires a **batch lookup** `GET /private/api/users?ids=a,b,c` → `[{id, username}]`. Identity today has only single-id lookup; adding the batch endpoint is a Plan 00 follow-up scheduled inside L5 (first phase that shows other users' names). Until then, resolve one by one with a small in-memory cache.

## 7. Frontend door

`POST /api/learn/graphql` (Next route handler) → `forwardToGateway(req, { service: "learn", backendPath: "/graphql" })`. Nothing else in the frontend talks to Learn. See [05-frontend.md](05-frontend.md).

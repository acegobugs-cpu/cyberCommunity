/**
 * GraphQL operation documents for the Learn API, extracted from
 * src/graphql/learn.graphql. Kept as plain strings so both server components
 * (via gatewayFetch) and client components (via /api/learn/graphql) can send
 * them without a GraphQL client library. Types come from ./generated.ts.
 */

const ENROLLMENT = /* GraphQL */ `
  fragment EnrollmentFields on Enrollment {
    pathId status progress enrolledAt completedAt nextLessonId
  }
`;

const PATH_CARD = /* GraphQL */ `
  ${ENROLLMENT}
  fragment PathCard on Path {
    id slug title description difficulty tags status estimatedMinutes updatedAt
    enrollment { ...EnrollmentFields }
  }
`;

const LESSON_SUMMARY = /* GraphQL */ `
  fragment LessonSummary on Lesson {
    id moduleId title type position estimatedMinutes completed
  }
`;

const PATH_TREE = /* GraphQL */ `
  ${PATH_CARD}
  ${LESSON_SUMMARY}
  fragment PathTree on Path {
    ...PathCard
    createdAt
    modules {
      id pathId title descriptionMd position
      myProgress { status progress completedAt }
      lessons { ...LessonSummary }
    }
  }
`;

export const ME = /* GraphQL */ `
  query Me { me { userId role canAuthor } }
`;

export const CATALOGUE = /* GraphQL */ `
  ${PATH_CARD}
  query Catalogue($difficulty: Difficulty, $tag: String, $search: String) {
    paths(difficulty: $difficulty, tag: $tag, search: $search) { ...PathCard }
  }
`;

export const PATH_BY_SLUG = /* GraphQL */ `
  ${PATH_TREE}
  query PathBySlug($slug: String!) { path(slug: $slug) { ...PathTree } }
`;

export const PATH_BY_ID = /* GraphQL */ `
  ${PATH_TREE}
  query PathById($id: ID!) { pathById(id: $id) { ...PathTree } }
`;

export const LESSON_BY_ID = /* GraphQL */ `
  ${LESSON_SUMMARY}
  query LessonById($id: ID!) { lesson(id: $id) { ...LessonSummary contentMd videoUrl } }
`;

export const MY_ENROLLMENTS = /* GraphQL */ `
  ${PATH_CARD}
  query MyEnrollments { myEnrollments { ...PathCard } }
`;

// ---------- learner mutations ----------

export const ENROLL = /* GraphQL */ `
  ${ENROLLMENT}
  mutation Enroll($pathId: ID!) { enroll(pathId: $pathId) { ...EnrollmentFields } }
`;

export const DROP_PATH = /* GraphQL */ `
  ${ENROLLMENT}
  mutation DropPath($pathId: ID!) { dropPath(pathId: $pathId) { ...EnrollmentFields } }
`;

export const COMPLETE_LESSON = /* GraphQL */ `
  mutation CompleteLesson($lessonId: ID!) { completeLesson(lessonId: $lessonId) { id completed } }
`;

export const UPSERT_PATH = /* GraphQL */ `
  ${PATH_CARD}
  mutation UpsertPath($input: PathInput!) { upsertPath(input: $input) { ...PathCard } }
`;

export const UPSERT_MODULE = /* GraphQL */ `
  mutation UpsertModule($input: ModuleInput!) {
    upsertModule(input: $input) { id pathId title descriptionMd position }
  }
`;

export const UPSERT_LESSON = /* GraphQL */ `
  ${LESSON_SUMMARY}
  mutation UpsertLesson($input: LessonInput!) { upsertLesson(input: $input) { ...LessonSummary contentMd videoUrl } }
`;

export const REORDER_MODULES = /* GraphQL */ `
  mutation ReorderModules($pathId: ID!, $orderedIds: [ID!]!) { reorderModules(pathId: $pathId, orderedIds: $orderedIds) { id } }
`;

export const REORDER_LESSONS = /* GraphQL */ `
  mutation ReorderLessons($moduleId: ID!, $orderedIds: [ID!]!) { reorderLessons(moduleId: $moduleId, orderedIds: $orderedIds) { id } }
`;

export const PUBLISH_PATH = /* GraphQL */ `
  mutation PublishPath($id: ID!, $published: Boolean) { publishPath(id: $id, published: $published) { id status } }
`;

export const ARCHIVE_PATH = /* GraphQL */ `
  mutation ArchivePath($id: ID!) { archivePath(id: $id) { id status } }
`;

export const DELETE_MODULE = /* GraphQL */ `
  mutation DeleteModule($id: ID!) { deleteModule(id: $id) }
`;

export const DELETE_LESSON = /* GraphQL */ `
  mutation DeleteLesson($id: ID!) { deleteLesson(id: $id) }
`;

/**
 * GraphQL operation documents for the Learn API, extracted from
 * src/graphql/learn.graphql. Kept as plain strings so both server components
 * (via gatewayFetch) and client components (via /api/learn/graphql) can send
 * them without a GraphQL client library. Types come from ./generated.ts.
 */

const COURSE_CARD = /* GraphQL */ `
  fragment CourseCard on Course {
    id slug title description difficulty tags status estimatedMinutes updatedAt
  }
`;

const LESSON_SUMMARY = /* GraphQL */ `
  fragment LessonSummary on Lesson {
    id moduleId title type position estimatedMinutes
  }
`;

const COURSE_TREE = /* GraphQL */ `
  ${COURSE_CARD}
  ${LESSON_SUMMARY}
  fragment CourseTree on Course {
    ...CourseCard
    createdAt
    modules {
      id courseId title descriptionMd position
      lessons { ...LessonSummary }
    }
  }
`;

export const CATALOGUE = /* GraphQL */ `
  ${COURSE_CARD}
  query Catalogue($difficulty: Difficulty, $tag: String, $search: String) {
    courses(difficulty: $difficulty, tag: $tag, search: $search) { ...CourseCard }
  }
`;

export const COURSE_BY_SLUG = /* GraphQL */ `
  ${COURSE_TREE}
  query CourseBySlug($slug: String!) { course(slug: $slug) { ...CourseTree } }
`;

export const COURSE_BY_ID = /* GraphQL */ `
  ${COURSE_TREE}
  query CourseById($id: ID!) { courseById(id: $id) { ...CourseTree } }
`;

export const LESSON_BY_ID = /* GraphQL */ `
  ${LESSON_SUMMARY}
  query LessonById($id: ID!) { lesson(id: $id) { ...LessonSummary contentMd videoUrl } }
`;

export const UPSERT_COURSE = /* GraphQL */ `
  ${COURSE_CARD}
  mutation UpsertCourse($input: CourseInput!) { upsertCourse(input: $input) { ...CourseCard } }
`;

export const UPSERT_MODULE = /* GraphQL */ `
  mutation UpsertModule($input: ModuleInput!) {
    upsertModule(input: $input) { id courseId title descriptionMd position }
  }
`;

export const UPSERT_LESSON = /* GraphQL */ `
  ${LESSON_SUMMARY}
  mutation UpsertLesson($input: LessonInput!) { upsertLesson(input: $input) { ...LessonSummary contentMd videoUrl } }
`;

export const REORDER_MODULES = /* GraphQL */ `
  mutation ReorderModules($courseId: ID!, $orderedIds: [ID!]!) { reorderModules(courseId: $courseId, orderedIds: $orderedIds) { id } }
`;

export const REORDER_LESSONS = /* GraphQL */ `
  mutation ReorderLessons($moduleId: ID!, $orderedIds: [ID!]!) { reorderLessons(moduleId: $moduleId, orderedIds: $orderedIds) { id } }
`;

export const PUBLISH_COURSE = /* GraphQL */ `
  mutation PublishCourse($id: ID!, $published: Boolean) { publishCourse(id: $id, published: $published) { id status } }
`;

export const ARCHIVE_COURSE = /* GraphQL */ `
  mutation ArchiveCourse($id: ID!) { archiveCourse(id: $id) { id status } }
`;

export const DELETE_MODULE = /* GraphQL */ `
  mutation DeleteModule($id: ID!) { deleteModule(id: $id) }
`;

export const DELETE_LESSON = /* GraphQL */ `
  mutation DeleteLesson($id: ID!) { deleteLesson(id: $id) }
`;

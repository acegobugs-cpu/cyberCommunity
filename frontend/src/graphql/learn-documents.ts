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
      id title descriptionMd
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
  mutation CompleteLesson($lessonId: ID!, $pathId: ID) { completeLesson(lessonId: $lessonId, pathId: $pathId) { id completed } }
`;

export const UPSERT_PATH = /* GraphQL */ `
  ${PATH_CARD}
  mutation UpsertPath($input: PathInput!) { upsertPath(input: $input) { ...PathCard } }
`;

export const UPSERT_MODULE = /* GraphQL */ `
  mutation UpsertModule($input: ModuleInput!) {
    upsertModule(input: $input) { id title descriptionMd }
  }
`;

export const MODULE_PICKER = /* GraphQL */ `
  query ModulePicker($search: String) { modules(search: $search) { id title descriptionMd } }
`;

export const ADD_MODULE_TO_PATH = /* GraphQL */ `
  mutation AddModuleToPath($pathId: ID!, $moduleId: ID!) { addModuleToPath(pathId: $pathId, moduleId: $moduleId) { id } }
`;

export const REMOVE_MODULE_FROM_PATH = /* GraphQL */ `
  mutation RemoveModuleFromPath($pathId: ID!, $moduleId: ID!) { removeModuleFromPath(pathId: $pathId, moduleId: $moduleId) { id } }
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

// ---------- roadmaps (L3) ----------

const ROADMAP_CARD = /* GraphQL */ `
  fragment RoadMapCard on RoadMap { id slug title descriptionMd status progress updatedAt }
`;

const ROADMAP_TREE = /* GraphQL */ `
  ${ROADMAP_CARD}
  ${PATH_CARD}
  fragment RoadMapTree on RoadMap {
    ...RoadMapCard
    createdAt
    items {
      id position groupType isRequired progress
      item {
        __typename
        ... on Path { ...PathCard }
        ... on Module {
          id title descriptionMd
          paths { id slug title status }
          myProgress { status progress }
        }
      }
    }
  }
`;

export const ROADMAPS = /* GraphQL */ `
  ${ROADMAP_CARD}
  query Roadmaps($search: String) { roadmaps(search: $search) { ...RoadMapCard } }
`;

export const ROADMAP_BY_SLUG = /* GraphQL */ `
  ${ROADMAP_TREE}
  query RoadmapBySlug($slug: String!) { roadmap(slug: $slug) { ...RoadMapTree } }
`;

export const ROADMAP_BY_ID = /* GraphQL */ `
  ${ROADMAP_TREE}
  query RoadmapById($id: ID!) { roadmapById(id: $id) { ...RoadMapTree } }
`;

export const MY_ROADMAPS = /* GraphQL */ `
  ${ROADMAP_CARD}
  query MyRoadmaps { myRoadmaps { ...RoadMapCard } }
`;

export const UPSERT_ROADMAP = /* GraphQL */ `
  ${ROADMAP_CARD}
  mutation UpsertRoadmap($input: RoadMapInput!) { upsertRoadmap(input: $input) { ...RoadMapCard } }
`;

export const SET_ROADMAP_ITEMS = /* GraphQL */ `
  mutation SetRoadmapItems($roadmapId: ID!, $items: [RoadMapItemInput!]!) { setRoadmapItems(roadmapId: $roadmapId, items: $items) { id } }
`;

export const PUBLISH_ROADMAP = /* GraphQL */ `
  mutation PublishRoadmap($id: ID!, $published: Boolean) { publishRoadmap(id: $id, published: $published) { id status } }
`;

export const ARCHIVE_ROADMAP = /* GraphQL */ `
  mutation ArchiveRoadmap($id: ID!) { archiveRoadmap(id: $id) { id status } }
`;

export const DELETE_ROADMAP = /* GraphQL */ `
  mutation DeleteRoadmap($id: ID!) { deleteRoadmap(id: $id) }
`;

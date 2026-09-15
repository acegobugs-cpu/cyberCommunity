/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** id absent → insert (slug generated from title when omitted); id present → update. */
export type CourseInput = {
  description?: string | null | undefined;
  difficulty?: Difficulty | null | undefined;
  id?: string | null | undefined;
  slug?: string | null | undefined;
  tags?: Array<string> | null | undefined;
  title: string;
};

/**
 * Learn — Plan 01, Phase L1 content model.
 * Enum vocabularies match the CHECK constraints in infra/migrations/learn/V1.
 * Timestamps are ISO-8601 strings.
 */
export type CourseStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type Difficulty =
  | 'ADVANCED'
  | 'BEGINNER'
  | 'INTERMEDIATE';

export type LessonInput = {
  contentMd?: string | null | undefined;
  estimatedMinutes?: number | null | undefined;
  id?: string | null | undefined;
  moduleId: string;
  position?: number | null | undefined;
  title: string;
  type?: LessonType | null | undefined;
  videoUrl?: string | null | undefined;
};

export type LessonType =
  | 'LAB'
  | 'PROJECT'
  | 'QUIZ'
  | 'READING'
  | 'VIDEO';

/** position omitted on insert → appended at the end. */
export type ModuleInput = {
  courseId: string;
  descriptionMd?: string | null | undefined;
  id?: string | null | undefined;
  position?: number | null | undefined;
  title: string;
};

export type CourseCardFragment = { id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string };

export type LessonSummaryFragment = { id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number };

export type CourseTreeFragment = { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, courseId: string, title: string, descriptionMd: string | null, position: number, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number }> }> };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { userId: string, role: string, canAuthor: boolean } };

export type CatalogueQueryVariables = Exact<{
  difficulty?: Difficulty | null | undefined;
  tag?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type CatalogueQuery = { courses: Array<{ id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string }> };

export type CourseBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type CourseBySlugQuery = { course: { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, courseId: string, title: string, descriptionMd: string | null, position: number, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number }> }> } | null };

export type CourseByIdQueryVariables = Exact<{
  id: string;
}>;


export type CourseByIdQuery = { courseById: { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, courseId: string, title: string, descriptionMd: string | null, position: number, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number }> }> } | null };

export type LessonByIdQueryVariables = Exact<{
  id: string;
}>;


export type LessonByIdQuery = { lesson: { contentMd: string | null, videoUrl: string | null, id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number } | null };

export type UpsertCourseMutationVariables = Exact<{
  input: CourseInput;
}>;


export type UpsertCourseMutation = { upsertCourse: { id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: CourseStatus, estimatedMinutes: number, updatedAt: string } };

export type UpsertModuleMutationVariables = Exact<{
  input: ModuleInput;
}>;


export type UpsertModuleMutation = { upsertModule: { id: string, courseId: string, title: string, descriptionMd: string | null, position: number } };

export type UpsertLessonMutationVariables = Exact<{
  input: LessonInput;
}>;


export type UpsertLessonMutation = { upsertLesson: { contentMd: string | null, videoUrl: string | null, id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number } };

export type ReorderModulesMutationVariables = Exact<{
  courseId: string;
  orderedIds: Array<string> | string;
}>;


export type ReorderModulesMutation = { reorderModules: { id: string } };

export type ReorderLessonsMutationVariables = Exact<{
  moduleId: string;
  orderedIds: Array<string> | string;
}>;


export type ReorderLessonsMutation = { reorderLessons: { id: string } };

export type PublishCourseMutationVariables = Exact<{
  id: string;
  published?: boolean | null | undefined;
}>;


export type PublishCourseMutation = { publishCourse: { id: string, status: CourseStatus } };

export type ArchiveCourseMutationVariables = Exact<{
  id: string;
}>;


export type ArchiveCourseMutation = { archiveCourse: { id: string, status: CourseStatus } };

export type DeleteModuleMutationVariables = Exact<{
  id: string;
}>;


export type DeleteModuleMutation = { deleteModule: boolean };

export type DeleteLessonMutationVariables = Exact<{
  id: string;
}>;


export type DeleteLessonMutation = { deleteLesson: boolean };

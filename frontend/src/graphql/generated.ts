/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type AnswerInput = {
  optionIds: Array<string>;
  questionId: string;
};

export type Difficulty =
  | 'ADVANCED'
  | 'BEGINNER'
  | 'INTERMEDIATE';

export type EnrollmentStatus =
  | 'COMPLETED'
  | 'DROPPED'
  | 'ENROLLED';

/** ALL: every item of the step counts; CHOICE: any one item of the step satisfies it. */
export type GroupType =
  | 'ALL'
  | 'CHOICE';

/** DOC needs contentMd, VIDEO needs videoUrl. Paths are unique per lesson; list order becomes position. */
export type LessonDocInput = {
  contentMd?: string | null | undefined;
  kind?: LessonDocKind | null | undefined;
  path: string;
  title: string;
  videoUrl?: string | null | undefined;
};

export type LessonDocKind =
  | 'DOC'
  | 'VIDEO';

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

/** On create, pathId (optional) appends the new module to that path. On update only title/descriptionMd change. */
export type ModuleInput = {
  descriptionMd?: string | null | undefined;
  id?: string | null | undefined;
  pathId?: string | null | undefined;
  title: string;
};

export type ModuleProgressStatus =
  | 'COMPLETED'
  | 'DROPPED'
  | 'IN_PROGRESS'
  | 'STARTED';

export type OptionInput = {
  correct?: boolean | null | undefined;
  textMd: string;
};

/** id absent → insert (slug generated from title when omitted); id present → update. */
export type PathInput = {
  description?: string | null | undefined;
  difficulty?: Difficulty | null | undefined;
  id?: string | null | undefined;
  slug?: string | null | undefined;
  tags?: Array<string> | null | undefined;
  title: string;
};

/**
 * Learn — Plan 01. L1 content model (paths → modules → lessons), L2 enrollment & progress, L3 roadmaps.
 * Enum vocabularies match the CHECK constraints in infra/migrations/learn/V1–V3.
 * Timestamps are ISO-8601 strings; progress values are 0..1.
 */
export type PathStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type QuestionInput = {
  kind?: QuestionKind | null | undefined;
  /** SINGLE needs exactly one correct option; MULTI at least one. */
  options: Array<OptionInput>;
  points?: number | null | undefined;
  promptMd: string;
};

export type QuestionKind =
  | 'MULTI'
  | 'SINGLE';

/** Full payload: questions and options are replaced wholesale. Positions follow list order. */
export type QuizInput = {
  lessonId: string;
  passScore?: number | null | undefined;
  questions: Array<QuestionInput>;
  shuffle?: boolean | null | undefined;
};

/** id absent → insert (slug generated from title when omitted); id present → update. Status changes go through publishRoadmap / archiveRoadmap. */
export type RoadMapInput = {
  descriptionMd?: string | null | undefined;
  id?: string | null | undefined;
  slug?: string | null | undefined;
  title: string;
};

/** Exactly one of pathId / moduleId. Items sharing a position form one step and must share groupType. */
export type RoadMapItemInput = {
  groupType?: GroupType | null | undefined;
  isRequired?: boolean | null | undefined;
  moduleId?: string | null | undefined;
  pathId?: string | null | undefined;
  position: number;
};

export type RoadMapStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type EnrollmentFieldsFragment = { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null };

export type PathCardFragment = { id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null };

export type LessonSummaryFragment = { id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean };

export type PathTreeFragment = { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, title: string, descriptionMd: string | null, myProgress: { status: ModuleProgressStatus, progress: number, completedAt: string | null } | null, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean }> }>, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { userId: string, role: string, canAuthor: boolean } };

export type CatalogueQueryVariables = Exact<{
  difficulty?: Difficulty | null | undefined;
  tag?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type CatalogueQuery = { paths: Array<{ id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null }> };

export type PathBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type PathBySlugQuery = { path: { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, title: string, descriptionMd: string | null, myProgress: { status: ModuleProgressStatus, progress: number, completedAt: string | null } | null, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean }> }>, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null } | null };

export type PathByIdQueryVariables = Exact<{
  id: string;
}>;


export type PathByIdQuery = { pathById: { createdAt: string, id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, modules: Array<{ id: string, title: string, descriptionMd: string | null, myProgress: { status: ModuleProgressStatus, progress: number, completedAt: string | null } | null, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean }> }>, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null } | null };

export type LessonByIdQueryVariables = Exact<{
  id: string;
}>;


export type LessonByIdQuery = { lesson: { contentMd: string | null, videoUrl: string | null, id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean, quiz: { id: string, lessonId: string, passScore: number, shuffle: boolean, myAttemptCount: number, attemptCount: number | null, passedCount: number | null, myBestAttempt: { id: string, score: number, passed: boolean, submittedAt: string } | null, questions: Array<{ id: string, position: number, promptMd: string, kind: QuestionKind, points: number, options: Array<{ id: string, position: number, textMd: string, correct: boolean | null }> }> } | null, docs: Array<{ id: string, path: string, kind: LessonDocKind, title: string, contentMd: string | null, videoUrl: string | null, position: number }> } | null };

export type LessonDocFieldsFragment = { id: string, path: string, kind: LessonDocKind, title: string, contentMd: string | null, videoUrl: string | null, position: number };

export type SetLessonDocsMutationVariables = Exact<{
  lessonId: string;
  docs: Array<LessonDocInput> | LessonDocInput;
}>;


export type SetLessonDocsMutation = { setLessonDocs: { id: string, docs: Array<{ id: string, path: string, kind: LessonDocKind, title: string, contentMd: string | null, videoUrl: string | null, position: number }> } };

export type QuizFieldsFragment = { id: string, lessonId: string, passScore: number, shuffle: boolean, myAttemptCount: number, attemptCount: number | null, passedCount: number | null, myBestAttempt: { id: string, score: number, passed: boolean, submittedAt: string } | null, questions: Array<{ id: string, position: number, promptMd: string, kind: QuestionKind, points: number, options: Array<{ id: string, position: number, textMd: string, correct: boolean | null }> }> };

export type SubmitQuizMutationVariables = Exact<{
  quizId: string;
  answers: Array<AnswerInput> | AnswerInput;
  pathId?: string | null | undefined;
}>;


export type SubmitQuizMutation = { submitQuiz: { id: string, score: number, passed: boolean, submittedAt: string, results: Array<{ questionId: string, correct: boolean, pointsEarned: number, points: number }> } };

export type UpsertQuizMutationVariables = Exact<{
  input: QuizInput;
}>;


export type UpsertQuizMutation = { upsertQuiz: { id: string, lessonId: string, passScore: number, shuffle: boolean, myAttemptCount: number, attemptCount: number | null, passedCount: number | null, myBestAttempt: { id: string, score: number, passed: boolean, submittedAt: string } | null, questions: Array<{ id: string, position: number, promptMd: string, kind: QuestionKind, points: number, options: Array<{ id: string, position: number, textMd: string, correct: boolean | null }> }> } };

export type MyEnrollmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyEnrollmentsQuery = { myEnrollments: Array<{ id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null }> };

export type EnrollMutationVariables = Exact<{
  pathId: string;
}>;


export type EnrollMutation = { enroll: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } };

export type DropPathMutationVariables = Exact<{
  pathId: string;
}>;


export type DropPathMutation = { dropPath: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } };

export type CompleteLessonMutationVariables = Exact<{
  lessonId: string;
  pathId?: string | null | undefined;
}>;


export type CompleteLessonMutation = { completeLesson: { id: string, completed: boolean } };

export type UpsertPathMutationVariables = Exact<{
  input: PathInput;
}>;


export type UpsertPathMutation = { upsertPath: { id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null } };

export type UpsertModuleMutationVariables = Exact<{
  input: ModuleInput;
}>;


export type UpsertModuleMutation = { upsertModule: { id: string, title: string, descriptionMd: string | null } };

export type ModulePickerQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type ModulePickerQuery = { modules: Array<{ id: string, title: string, descriptionMd: string | null }> };

export type AddModuleToPathMutationVariables = Exact<{
  pathId: string;
  moduleId: string;
}>;


export type AddModuleToPathMutation = { addModuleToPath: { id: string } };

export type RemoveModuleFromPathMutationVariables = Exact<{
  pathId: string;
  moduleId: string;
}>;


export type RemoveModuleFromPathMutation = { removeModuleFromPath: { id: string } };

export type UpsertLessonMutationVariables = Exact<{
  input: LessonInput;
}>;


export type UpsertLessonMutation = { upsertLesson: { contentMd: string | null, videoUrl: string | null, id: string, moduleId: string, title: string, type: LessonType, position: number, estimatedMinutes: number, completed: boolean } };

export type ReorderModulesMutationVariables = Exact<{
  pathId: string;
  orderedIds: Array<string> | string;
}>;


export type ReorderModulesMutation = { reorderModules: { id: string } };

export type ReorderLessonsMutationVariables = Exact<{
  moduleId: string;
  orderedIds: Array<string> | string;
}>;


export type ReorderLessonsMutation = { reorderLessons: { id: string } };

export type PublishPathMutationVariables = Exact<{
  id: string;
  published?: boolean | null | undefined;
}>;


export type PublishPathMutation = { publishPath: { id: string, status: PathStatus } };

export type ArchivePathMutationVariables = Exact<{
  id: string;
}>;


export type ArchivePathMutation = { archivePath: { id: string, status: PathStatus } };

export type DeleteModuleMutationVariables = Exact<{
  id: string;
}>;


export type DeleteModuleMutation = { deleteModule: boolean };

export type DeleteLessonMutationVariables = Exact<{
  id: string;
}>;


export type DeleteLessonMutation = { deleteLesson: boolean };

export type RoadMapCardFragment = { id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string };

export type RoadMapTreeFragment = { createdAt: string, id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string, items: Array<{ id: string, position: number, groupType: GroupType, isRequired: boolean, progress: number, item:
      | { __typename: 'Module', id: string, title: string, descriptionMd: string | null, paths: Array<{ id: string, slug: string, title: string, status: PathStatus }>, myProgress: { status: ModuleProgressStatus, progress: number } | null }
      | { __typename: 'Path', id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null }
     }> };

export type RoadmapsQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type RoadmapsQuery = { roadmaps: Array<{ id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string }> };

export type RoadmapBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type RoadmapBySlugQuery = { roadmap: { createdAt: string, id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string, items: Array<{ id: string, position: number, groupType: GroupType, isRequired: boolean, progress: number, item:
        | { __typename: 'Module', id: string, title: string, descriptionMd: string | null, paths: Array<{ id: string, slug: string, title: string, status: PathStatus }>, myProgress: { status: ModuleProgressStatus, progress: number } | null }
        | { __typename: 'Path', id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null }
       }> } | null };

export type RoadmapByIdQueryVariables = Exact<{
  id: string;
}>;


export type RoadmapByIdQuery = { roadmapById: { createdAt: string, id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string, items: Array<{ id: string, position: number, groupType: GroupType, isRequired: boolean, progress: number, item:
        | { __typename: 'Module', id: string, title: string, descriptionMd: string | null, paths: Array<{ id: string, slug: string, title: string, status: PathStatus }>, myProgress: { status: ModuleProgressStatus, progress: number } | null }
        | { __typename: 'Path', id: string, slug: string, title: string, description: string | null, difficulty: Difficulty, tags: Array<string>, status: PathStatus, estimatedMinutes: number, updatedAt: string, enrollment: { pathId: string, status: EnrollmentStatus, progress: number, enrolledAt: string, completedAt: string | null, nextLessonId: string | null } | null }
       }> } | null };

export type MyRoadmapsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyRoadmapsQuery = { myRoadmaps: Array<{ id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string }> };

export type UpsertRoadmapMutationVariables = Exact<{
  input: RoadMapInput;
}>;


export type UpsertRoadmapMutation = { upsertRoadmap: { id: string, slug: string, title: string, descriptionMd: string | null, status: RoadMapStatus, progress: number, updatedAt: string } };

export type SetRoadmapItemsMutationVariables = Exact<{
  roadmapId: string;
  items: Array<RoadMapItemInput> | RoadMapItemInput;
}>;


export type SetRoadmapItemsMutation = { setRoadmapItems: { id: string } };

export type PublishRoadmapMutationVariables = Exact<{
  id: string;
  published?: boolean | null | undefined;
}>;


export type PublishRoadmapMutation = { publishRoadmap: { id: string, status: RoadMapStatus } };

export type ArchiveRoadmapMutationVariables = Exact<{
  id: string;
}>;


export type ArchiveRoadmapMutation = { archiveRoadmap: { id: string, status: RoadMapStatus } };

export type DeleteRoadmapMutationVariables = Exact<{
  id: string;
}>;


export type DeleteRoadmapMutation = { deleteRoadmap: boolean };

import { gatewayFetch } from "@/lib/gateway";
import { unwrap, type GraphQlResponse } from "@/lib/learn/graphql";
import {
  CATALOGUE,
  COURSE_BY_ID,
  COURSE_BY_SLUG,
  LESSON_BY_ID,
} from "@/graphql/learn-documents";
import type {
  CatalogueQuery,
  CatalogueQueryVariables,
  CourseByIdQuery,
  CourseBySlugQuery,
  LessonByIdQuery,
} from "@/graphql/generated";

/**
 * Server-side Learn queries (server components / route handlers). Calls the
 * gateway directly with the session token; the browser goes through
 * /api/learn/graphql instead.
 */
export async function learnQuery<T, V extends object = Record<string, never>>(
  query: string,
  variables: V,
): Promise<T> {
  const res = await gatewayFetch("/graphql", {
    service: "learn",
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`learn responded ${res.status}`);
  }
  const json = (await res.json()) as GraphQlResponse<T>;
  return unwrap(json);
}

/** Catalogue; returns [] when signed out or the gateway is down so the page can still render. */
export async function getCatalogue( variables: CatalogueQueryVariables = {} ): Promise<{ courses: CatalogueQuery["courses"]; error: string | null }> {
  try {
    const data = await learnQuery<CatalogueQuery, CatalogueQueryVariables>(CATALOGUE, variables);
    return { courses: data.courses, error: null };
  } catch (err) {
    return { courses: [], error: err instanceof Error ? err.message : "learn service unavailable" };
  }
}

export async function getCourseBySlug(slug: string) {
  try {
    const data = await learnQuery<CourseBySlugQuery, { slug: string }>(COURSE_BY_SLUG, { slug });
    return data.course;
  } catch {
    return null;
  }
}

export async function getCourseById(id: string) {
  try {
    const data = await learnQuery<CourseByIdQuery, { id: string }>(COURSE_BY_ID, { id });
    return data.courseById;
  } catch {
    return null;
  }
}

export async function getLesson(id: string) {
  try {
    const data = await learnQuery<LessonByIdQuery, { id: string }>(LESSON_BY_ID, { id });
    return data.lesson;
  } catch {
    return null;
  }
}

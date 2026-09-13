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
  token: string | null,
): Promise<T> {
  const res = await gatewayFetch("/graphql", {
    service: "learn",
    token,
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
export async function getCatalogue(
  token: string | null,
  variables: CatalogueQueryVariables = {},
): Promise<{ courses: CatalogueQuery["courses"]; error: string | null }> {
  if (!token) return { courses: [], error: "sign in to browse courses" };
  try {
    const data = await learnQuery<CatalogueQuery, CatalogueQueryVariables>(CATALOGUE, variables, token);
    return { courses: data.courses, error: null };
  } catch (err) {
    return { courses: [], error: err instanceof Error ? err.message : "learn service unavailable" };
  }
}

export async function getCourseBySlug(token: string | null, slug: string) {
  if (!token) return null;
  try {
    const data = await learnQuery<CourseBySlugQuery, { slug: string }>(COURSE_BY_SLUG, { slug }, token);
    return data.course;
  } catch {
    return null;
  }
}

export async function getCourseById(token: string | null, id: string) {
  if (!token) return null;
  try {
    const data = await learnQuery<CourseByIdQuery, { id: string }>(COURSE_BY_ID, { id }, token);
    return data.courseById;
  } catch {
    return null;
  }
}

export async function getLesson(token: string | null, id: string) {
  if (!token) return null;
  try {
    const data = await learnQuery<LessonByIdQuery, { id: string }>(LESSON_BY_ID, { id }, token);
    return data.lesson;
  } catch {
    return null;
  }
}

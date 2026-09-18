import { gatewayFetch } from "@/lib/gateway";
import { unwrap, type GraphQlResponse } from "@/lib/learn/graphql";
import {
  CATALOGUE,
  PATH_BY_ID,
  PATH_BY_SLUG,
  LESSON_BY_ID,
  MY_ENROLLMENTS,
} from "@/graphql/learn-documents";
import type {
  CatalogueQuery,
  CatalogueQueryVariables,
  PathByIdQuery,
  PathBySlugQuery,
  LessonByIdQuery,
  MyEnrollmentsQuery,
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
export async function getCatalogue( variables: CatalogueQueryVariables = {} ): Promise<{ paths: CatalogueQuery["paths"]; error: string | null }> {
  try {
    const data = await learnQuery<CatalogueQuery, CatalogueQueryVariables>(CATALOGUE, variables);
    return { paths: data.paths, error: null };
  } catch (err) {
    return { paths: [], error: err instanceof Error ? err.message : "learn service unavailable" };
  }
}

export async function getPathBySlug(slug: string) {
  try {
    const data = await learnQuery<PathBySlugQuery, { slug: string }>(PATH_BY_SLUG, { slug });
    return data.path;
  } catch {
    return null;
  }
}

export async function getPathById(id: string) {
  try {
    const data = await learnQuery<PathByIdQuery, { id: string }>(PATH_BY_ID, { id });
    return data.pathById;
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

/** Paths the caller is enrolled in (in-progress first). [] when signed out or unavailable. */
export async function getMyEnrollments(): Promise<MyEnrollmentsQuery["myEnrollments"]> {
  try {
    const data = await learnQuery<MyEnrollmentsQuery>(MY_ENROLLMENTS, {});
    return data.myEnrollments;
  } catch {
    return [];
  }
}

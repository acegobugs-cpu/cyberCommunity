"use client";

import { api } from "@/lib/api";
import { unwrap, type GraphQlResponse } from "@/lib/learn/graphql";

/** Browser-side Learn call through the BFF door (`/api/learn/graphql`). */
export async function learnMutate<T, V extends object>(query: string, variables: V): Promise<T> {
  const res = await api.post<GraphQlResponse<T>>("/api/learn/graphql", { query, variables });
  return unwrap(res);
}

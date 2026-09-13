/** Shape of a GraphQL HTTP response and helpers shared by server and client callers. */

export interface GraphQlError {
  message: string;
  path?: (string | number)[];
  extensions?: { classification?: string; correlationId?: string };
}

export interface GraphQlResponse<T> {
  data?: T | null;
  errors?: GraphQlError[];
}

export class LearnApiError extends Error {
  classification: string;
  correlationId?: string;
  constructor(errors: GraphQlError[]) {
    super(errors.map((e) => e.message).join("; ") || "GraphQL error");
    this.classification = errors[0]?.extensions?.classification ?? "UNKNOWN";
    this.correlationId = errors[0]?.extensions?.correlationId;
  }
}

export function unwrap<T>(res: GraphQlResponse<T>): T {
  if (res.errors && res.errors.length > 0) {
    throw new LearnApiError(res.errors);
  }
  if (res.data === undefined || res.data === null) {
    throw new LearnApiError([{ message: "empty GraphQL response" }]);
  }
  return res.data;
}

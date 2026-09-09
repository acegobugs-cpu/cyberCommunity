/**
 * Browser-side fetch wrapper for the BFF (`/api/*`).
 *
 * Authentication is cookie-based: the session JWT lives in an httpOnly cookie
 * set by the BFF, so the client never handles tokens. Requests use
 * `credentials: "same-origin"` (the default) and a 401 from the BFF means the
 * session is missing or expired; `onUnauthorized` lets the auth context react.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler = () => {};

export function configureApi(opts: { onUnauthorized?: UnauthorizedHandler }) {
  if (opts.onUnauthorized) {
    onUnauthorized = opts.onUnauthorized;
  }
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/api/sign")) {
      onUnauthorized();
    }
    const message =
      (isJson && body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : null) ||
      (isJson && body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ||
      res.statusText ||
      `request failed: ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiError };

import { ApiError } from "./errors";
import type { ApiErrorShape } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/**
 * In the browser every call goes through the same-origin /api proxy
 * (rewrites in next.config.ts): the session cookies then land on the
 * storefront origin as first-party, so proxy.ts can see them and no
 * cross-site cookie policy is involved. On the server (RSC pages) the
 * call goes straight to the API origin.
 */
const resolveApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return API_BASE_URL;
  }
  return API_BASE_URL.replace(/^https?:\/\/[^/]+/, "");
};

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiRequestOptions<TBody> extends Omit<RequestInit, "body"> {
  /** Serialized to JSON automatically. */
  body?: TBody;
  method?: ApiMethod;
}

/**
 * The session rides in httpOnly cookies (set/cleared by the backend auth
 * endpoints) — credentials: "include" attaches them and no token is ever
 * held in JS storage. On a 401 the client tries one silent refresh and
 * replays the original request once.
 */
export async function apiFetch<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  return request<TResponse, TBody>(path, options, true);
}

/** Single-flight: concurrent 401s share one refresh round-trip. */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${resolveApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  }).then(
    (response) => response.ok,
    () => false,
  ).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function request<TResponse, TBody>(
  path: string,
  options: ApiRequestOptions<TBody>,
  allowRefreshRetry: boolean,
): Promise<TResponse> {
  const { body, headers, cache = "no-store", ...rest } = options;
  // FormData (admin uploads) goes out verbatim — the browser sets the
  // multipart boundary header itself.
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...rest,
    cache,
    credentials: "include",
    headers: {
      ...(body !== undefined && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as unknown as BodyInit)
          : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Failed credential submissions must surface as-is (and not spend the
    // auth endpoints' throttle budget on a pointless refresh attempt).
    const credentialFailure = path === "/auth/login" || path === "/auth/register";
    if (
      response.status === 401 &&
      allowRefreshRetry &&
      !credentialFailure &&
      (await refreshSession())
    ) {
      return request<TResponse, TBody>(path, options, false);
    }
    const shape = (payload ?? {}) as Partial<ApiErrorShape>;
    throw new ApiError(
      response.status,
      shape.message ?? `Request failed with status ${response.status}`,
      shape.errors ?? {},
    );
  }

  return payload as TResponse;
}

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

interface ApiRequestOptions<TBody> extends Omit<RequestInit, "body" | "next"> {
  /** Serialized to JSON automatically. */
  body?: TBody;
  method?: ApiMethod;
  /** Next Data Cache controls for server-rendered GETs: pass
   * `{ tags: ["products"] }` and the response is cached until a matching
   * revalidateTag (admin mutations call the revalidateStorefrontTags
   * server action). Ignored in the browser. */
  next?: { tags?: string[]; revalidate?: number };
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
  const { body, headers, next, ...rest } = options;
  // Tagged requests opt into the Next Data Cache (server-rendered GETs);
  // everything else stays no-store so session-sensitive reads are fresh.
  const cache = next ? "force-cache" : "no-store";
  // FormData (admin uploads) goes out verbatim — the browser sets the
  // multipart boundary header itself.
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      ...rest,
      cache,
      next,
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
  } catch (cause) {
    // A dead API must be visible in server logs — RSC callers degrade
    // gracefully with .catch(() => null) and would hide the outage.
    if (typeof window === "undefined") {
      console.error(`[api] network failure ${path}`, cause);
    }
    throw cause;
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (typeof window === "undefined" && response.status >= 500) {
      console.error(`[api] ${response.status} ${path}`);
    }
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

  if (payload === null) {
    // A 2xx with unparsable JSON is a protocol breach, not empty data —
    // returning null here would flow corrupt "success" into components.
    throw new ApiError(response.status, "Malformed JSON response", {});
  }

  return payload as TResponse;
}

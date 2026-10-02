import { ApiError } from "./errors";
import type { ApiErrorShape } from "./types";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiRequestOptions<TBody> extends Omit<RequestInit, "body"> {
  /** Serialized to JSON automatically. */
  body?: TBody;
  method?: ApiMethod;
}

/**
 * Single entry point for all backend calls: base URL, JSON, credentials,
 * Authorization header and error normalization live here. Services call
 * this — components never call fetch directly.
 */
export async function apiFetch<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  const { body, headers, cache = "no-store", ...rest } = options;
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    cache,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const shape = (payload ?? {}) as Partial<ApiErrorShape>;
    if (response.status === 401) {
      useAuthStore.getState().clear();
    }
    throw new ApiError(
      response.status,
      shape.message ?? `Request failed with status ${response.status}`,
      shape.errors ?? {},
    );
  }

  return payload as TResponse;
}

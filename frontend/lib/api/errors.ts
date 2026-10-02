/** Error thrown by the API client for any non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/** Extracts a human-readable message from an unknown error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const firstField = Object.values(error.errors)[0]?.[0];
    return firstField ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}

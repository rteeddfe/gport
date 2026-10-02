/**
 * Predictable error shape returned by the NestJS API
 * (see backend AllExceptionsFilter).
 */
export interface ApiErrorShape {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

/** Generic paginated list response (backend collections). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

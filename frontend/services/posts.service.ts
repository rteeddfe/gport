import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type { Post, PostStatus } from "@/types/api";

export interface FindPostsParams {
  page?: number;
  limit?: number;
  status?: PostStatus;
}

/** Public blog list — the backend returns PUBLISHED posts only. */
export function getPosts(params: FindPostsParams = {}): Promise<Paginated<Post>> {
  return apiFetch<Paginated<Post>>(`/posts${buildQuery({ ...params })}`);
}

/** Public post page is slug-addressed (GET /posts/:slug). */
export function getPost(slug: string): Promise<Post> {
  return apiFetch<Post>(`/posts/${slug}`);
}

export interface AdminPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  /** null clears the cover; undefined keeps the current one. */
  coverImageUrl?: string | null;
  status?: PostStatus;
}

export function adminGetPosts(params: FindPostsParams = {}): Promise<Paginated<Post>> {
  return apiFetch<Paginated<Post>>(`/admin/posts${buildQuery({ ...params })}`);
}

export function adminGetPost(id: string): Promise<Post> {
  return apiFetch<Post>(`/admin/posts/${id}`);
}

export function adminCreatePost(input: AdminPostInput): Promise<Post> {
  return apiFetch<Post, AdminPostInput>("/admin/posts", {
    method: "POST",
    body: input,
  });
}

export function adminUpdatePost(id: string, input: AdminPostInput): Promise<Post> {
  return apiFetch<Post, AdminPostInput>(`/admin/posts/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeletePost(id: string): Promise<void> {
  return apiFetch<void>(`/admin/posts/${id}`, { method: "DELETE" });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminCreatePost,
  adminDeletePost,
  adminGetPost,
  adminGetPosts,
  adminUpdatePost,
  type AdminPostInput,
  type FindPostsParams,
} from "@/services/posts.service";

export function useAdminPosts(params: FindPostsParams = {}) {
  return useQuery({
    queryKey: ["admin-posts", params],
    queryFn: () => adminGetPosts(params),
  });
}

export function useAdminPost(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-post", id],
    queryFn: () => adminGetPost(id as string),
    enabled: id !== undefined,
  });
}

export function useAdminPostMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // The public /blog pages read the same rows server-side; admin list
    // keeps its own cache.
    queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
  };

  const create = useMutation({
    mutationFn: (input: AdminPostInput) => adminCreatePost(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPostInput }) =>
      adminUpdatePost(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeletePost(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

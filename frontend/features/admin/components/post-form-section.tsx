"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PostForm } from "./post-form";
import { useAdminPost } from "../hooks/use-admin-posts";

/** Data wrapper: loads the post on the edit page, renders the bare form
 * on the create page. */
export function PostFormSection({ postId }: { postId?: string }) {
  const query = useAdminPost(postId);

  if (postId !== undefined) {
    if (query.isPending) {
      return <Skeleton className="h-96 w-full" />;
    }
    if (query.isError) {
      return (
        <p className="text-destructive text-sm">
          Не удалось загрузить новость: {query.error.message}
        </p>
      );
    }
    return <PostForm post={query.data} />;
  }
  return <PostForm />;
}

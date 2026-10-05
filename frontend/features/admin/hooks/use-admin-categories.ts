"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revalidateStorefrontTags } from "@/lib/revalidate";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminUpdateCategory,
  getCategories,
  type AdminCategoryInput,
} from "@/services/categories.service";

/** The public GET /categories already returns every category with its
 * products count — the admin list reads the same endpoint. */
export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: getCategories });
}

export function useAdminCategoryMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // Category rows render in the catalog chips and on product pages.
    void revalidateStorefrontTags(["categories", "products"]);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const create = useMutation({
    mutationFn: (input: AdminCategoryInput) => adminCreateCategory(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminCategoryInput }) =>
      adminUpdateCategory(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCategory(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

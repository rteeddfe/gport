"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revalidateStorefrontTags } from "@/lib/revalidate";
import {
  adminCreateListValue,
  adminDeleteListValue,
  adminUpdateListValue,
  getListValues,
  type AdminListValueInput,
} from "@/services/list-values.service";

/** Public/admin read of the whole registry (the values feed the product
 * form selects and the catalog filter labels). */
export function useListValues() {
  return useQuery({ queryKey: ["list-values"], queryFn: () => getListValues() });
}

export function useAdminListValueMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // Values render on the storefront (labels, filter names) and in the
    // admin selects — refresh both caches.
    void revalidateStorefrontTags(["products"]);
    queryClient.invalidateQueries({ queryKey: ["list-values"] });
  };

  const create = useMutation({
    mutationFn: (input: AdminListValueInput) => adminCreateListValue(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AdminListValueInput> }) =>
      adminUpdateListValue(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteListValue(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

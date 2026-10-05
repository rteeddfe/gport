"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revalidateStorefrontTags } from "@/lib/revalidate";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminGetProducts,
  adminUpdateProduct,
  type AdminProductInput,
  type FindProductsParams,
} from "@/services/products.service";

export function useAdminProducts(params: FindProductsParams = {}) {
  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: () => adminGetProducts(params),
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => adminGetProduct(id as string),
    enabled: id !== undefined,
  });
}

export function useAdminProductMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // The public catalog, product page and search read the same rows —
    // drop the server Data Cache tags, then refresh the client caches.
    void revalidateStorefrontTags(["products"]);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const create = useMutation({
    mutationFn: (input: AdminProductInput) => adminCreateProduct(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminProductInput }) =>
      adminUpdateProduct(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

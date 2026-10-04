"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminGetPromoCodes,
  adminUpdatePromoCode,
  type AdminPromoCodeInput,
  type FindPromoCodesParams,
} from "@/services/promo-codes.service";

export function useAdminPromoCodes(params: FindPromoCodesParams = {}) {
  return useQuery({
    queryKey: ["admin-promo-codes", params],
    queryFn: () => adminGetPromoCodes(params),
  });
}

export function useAdminPromoCodeMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
  };

  const create = useMutation({
    mutationFn: (input: AdminPromoCodeInput) => adminCreatePromoCode(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPromoCodeInput }) =>
      adminUpdatePromoCode(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeletePromoCode(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

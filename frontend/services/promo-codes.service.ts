import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type { DiscountType, PromoCode } from "@/types/api";

export interface FindPromoCodesParams {
  page?: number;
  limit?: number;
}

/** Empty optional fields arrive as null — the backend clears them. */
export interface AdminPromoCodeInput {
  code: string;
  discountType: DiscountType;
  /** PERCENT: 1..99, FIXED: kopecks. */
  value: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  minSubtotalCents?: number | null;
}

export function adminGetPromoCodes(
  params: FindPromoCodesParams = {},
): Promise<Paginated<PromoCode>> {
  return apiFetch<Paginated<PromoCode>>(
    `/admin/promo-codes${buildQuery({ ...params })}`,
  );
}

export function adminCreatePromoCode(input: AdminPromoCodeInput): Promise<PromoCode> {
  return apiFetch<PromoCode, AdminPromoCodeInput>("/admin/promo-codes", {
    method: "POST",
    body: input,
  });
}

export function adminUpdatePromoCode(
  id: string,
  input: AdminPromoCodeInput,
): Promise<PromoCode> {
  return apiFetch<PromoCode, AdminPromoCodeInput>(`/admin/promo-codes/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeletePromoCode(id: string): Promise<void> {
  return apiFetch<void>(`/admin/promo-codes/${id}`, { method: "DELETE" });
}

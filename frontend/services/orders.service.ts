import { apiFetch } from "@/lib/api/client";
import type { AdminOrderView, OrderView, PaginatedOrders } from "@/types/api";

export interface CreateOrderInput {
  productId: string;
  quantity: number;
  provider: string;
  email?: string;
  /** TOPUP_NOMINAL only: the chosen nominal of the product. */
  variantId?: string;
  /** TOPUP_AMOUNT only: the buyer-entered top-up amount (kopecks). */
  amountCents?: number;
  /** TOPUP_* only: the account to credit (login, player ID). */
  accountIdentifier?: string;
  /** Optional promo code — validated and priced server-side. */
  promoCode?: string;
}

export interface CreateOrderResult extends OrderView {
  redirectUrl: string;
}

/** Direct checkout (no cart): creates the order + payment session and
 * returns the acquirer redirect URL the browser must follow. */
export function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  return apiFetch<CreateOrderResult, CreateOrderInput>("/orders", {
    method: "POST",
    body: input,
  });
}

/** The buyer's own orders (profile → Заказы). */
export function getMyOrders(headers?: Record<string, string>): Promise<OrderView[]> {
  return apiFetch<OrderView[]>("/orders/my", { headers });
}

export interface FindOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function adminGetOrders(
  params: FindOrdersParams = {},
): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(
    `/admin/orders?${new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value);
          return acc;
        },
        {},
      ),
    )}`,
  );
}

import type { DiscountType, Product } from '../generated/prisma/client.js';

export interface CartItemView {
  id: string;
  quantity: number;
  /** false when the product is not PUBLISHED anymore; excluded from totals. */
  available: boolean;
  product: Product;
}

export interface CartPromoView {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
}

export interface CartView {
  id: string | null;
  items: CartItemView[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promoCode: CartPromoView | null;
}

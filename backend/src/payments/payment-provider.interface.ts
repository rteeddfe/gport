/**
 * The minimal provider boundary (M-PAYMENTS-1). Every acquirer plugs into
 * the payments core through this contract; the core (PaymentsService) owns
 * the shared lifecycle — status transitions, fulfillment, idempotency,
 * audit — while adapters own everything provider-specific.
 *
 * The interface only declares operations that exist and are needed today
 * (session creation). Webhook verification stays in the core until a
 * second real provider forces the split — fake support for operations no
 * provider exercises is deliberately NOT added.
 */
export interface PaymentOrderRef {
  id: string;
  provider: string;
  /** Immutable order snapshot — an adapter must never trust a client
   * supplied amount; the core and the provider both carry this value. */
  totalCents: number;
  currency: string;
  email: string | null;
}

export interface PaymentSessionResult {
  /** Where the buyer is redirected to confirm the payment. */
  redirectUrl: string;
}

export interface PaymentProviderAdapter {
  /** Stable provider id — matches PAYMENT_PROVIDERS metadata. */
  readonly id: string;
  createPaymentSession(order: PaymentOrderRef): Promise<PaymentSessionResult>;
}

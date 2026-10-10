import { Injectable } from '@nestjs/common';
import { TestPaymentProvider } from './providers/test-payment.provider.js';
import type { PaymentProviderAdapter } from './payment-provider.interface.js';

/**
 * Registry/selection of payment providers (M-PAYMENTS-1 §4): a provider is
 * only reachable when an adapter is registered HERE — never via a frontend
 * URL, endpoint name or arbitrary class. Enablement (settings + production
 * gating) is checked separately by PaymentsService.isEnabled.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly adapters: Map<string, PaymentProviderAdapter>;

  constructor(testProvider: TestPaymentProvider) {
    this.adapters = new Map<string, PaymentProviderAdapter>([
      [testProvider.id, testProvider],
    ]);
  }

  /** Returns the registered adapter or null — an unknown provider is
   * rejected by the core, never resolved from client input. */
  get(providerId: string): PaymentProviderAdapter | null {
    return this.adapters.get(providerId) ?? null;
  }
}

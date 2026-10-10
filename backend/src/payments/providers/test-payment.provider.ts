import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  PaymentOrderRef,
  PaymentProviderAdapter,
  PaymentSessionResult,
} from '../payment-provider.interface.js';

/**
 * The TEST acquiring emulator as a provider adapter (M-PAYMENTS-1 §8): it
 * walks the same lifecycle as a real provider — session (capability token
 * stored on the order) → redirect to /pay/test/:token → signed S2S webhook
 * handled by the core. It is registered like any other adapter but gated:
 * the core refuses to enable it in production without an explicit
 * PAYMENTS_ALLOW_TEST_EMULATOR=true.
 */
@Injectable()
export class TestPaymentProvider implements PaymentProviderAdapter {
  readonly id = 'test';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createPaymentSession(order: PaymentOrderRef): Promise<PaymentSessionResult> {
    // The token is the capability: it authorizes the emulator page and the
    // signed webhook — knowing it IS the authorization to pay this order.
    const token = randomBytes(24).toString('base64url');
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentToken: token },
    });
    return { redirectUrl: `${this.storefrontOrigin()}/pay/test/${token}` };
  }

  private storefrontOrigin(): string {
    const configured = this.configService.get<string>('storefrontOrigin');
    if (configured) {
      return configured;
    }
    const origins = this.configService.get<string[]>('corsOrigins') ?? [];
    return origins[0] ?? 'http://localhost:3000';
  }
}

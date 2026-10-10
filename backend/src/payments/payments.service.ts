import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from './mail.service.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../audit/audit.constants.js';
import type { AuditActor } from '../audit/audit.types.js';
import { AuditService } from '../audit/audit.service.js';
import { PaymentProviderRegistry } from './payment-provider-registry.js';
import {
  PAYMENT_PROVIDERS,
  type PaymentProviderMeta,
} from '../common/constants/payment-providers.js';
import type { TestWebhookDto } from './dto/test-webhook.dto.js';
import type { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto.js';

export interface ProviderConfigView {
  enabled: boolean;
  config: Record<string, string>;
}

export interface PaymentSettingsView {
  testEnabled: boolean;
  providers: Record<string, ProviderConfigView>;
  providerMeta: PaymentProviderMeta[];
  updatedAt: Date;
}

export interface TestSessionView {
  orderId: string;
  status: OrderStatus;
  amountCents: number;
  currency: string;
  description: string;
}

/** Development fallback — production sets PAYMENTS_WEBHOOK_SECRET. */
const DEV_WEBHOOK_SECRET = 'dev-test-acquiring-secret';

/** The acquiring settings singleton row (never a second one). */
const PAYMENT_SETTINGS_ID = 1;

/** System actor for payment lifecycle events: webhooks and session opens
 * are machine events, not user actions (M-AUDIT-1 actor model). */
const SYSTEM_ACTOR: AuditActor = { id: null, role: null };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mail: MailService,
    private readonly auditService: AuditService,
    private readonly providerRegistry: PaymentProviderRegistry,
  ) {}

  /** Self-healing read of the acquiring settings singleton. */
  async findSettings(): Promise<PaymentSettingsView> {
    const row =
      (await this.prisma.paymentSettings.findUnique({ where: { id: PAYMENT_SETTINGS_ID } })) ??
      (await this.prisma.paymentSettings.create({ data: { id: PAYMENT_SETTINGS_ID } }));
    return {
      testEnabled: row.testEnabled,
      providers: this.sanitizeProviders(row.providers),
      providerMeta: PAYMENT_PROVIDERS,
      updatedAt: row.updatedAt,
    };
  }

  async updateSettings(dto: UpdatePaymentSettingsDto): Promise<PaymentSettingsView> {
    const row = await this.prisma.paymentSettings.upsert({
      where: { id: PAYMENT_SETTINGS_ID },
      update: {
        testEnabled: dto.testEnabled,
        providers: this.sanitizeProviders(dto.providers) as object,
      },
      create: {
        id: PAYMENT_SETTINGS_ID,
        testEnabled: dto.testEnabled,
        providers: this.sanitizeProviders(dto.providers) as object,
      },
    });
    this.logger.log(
      `Payment settings updated: test=${row.testEnabled}, providers=${Object.keys(row.providers as object).length}`,
    );
    return this.findSettings();
  }

  /** True when the provider can take orders right now: the test emulator
   * needs its toggle AND a non-production environment (an explicit
   * PAYMENTS_ALLOW_TEST_EMULATOR=true re-enables it deliberately); real
   * acquirers additionally need their integration. */
  async isEnabled(providerId: string): Promise<boolean> {
    const settings = await this.findSettings();
    if (providerId === 'test') {
      return settings.testEnabled && this.testEmulatorAllowed();
    }
    const meta = PAYMENT_PROVIDERS.find((p) => p.id === providerId);
    return meta?.live === true && settings.providers[providerId]?.enabled === true;
  }

  /** Enabled providers for the public buy dialog. */
  async listEnabled(): Promise<{ id: string; name: string }[]> {
    const settings = await this.findSettings();
    const testAllowed = this.testEmulatorAllowed();
    return PAYMENT_PROVIDERS.filter((meta) =>
      meta.id === 'test'
        ? settings.testEnabled && testAllowed
        : meta.live && settings.providers[meta.id]?.enabled === true,
    ).map(({ id, name }) => ({ id, name }));
  }

  /** Opens a payment session at the provider; returns the redirect URL.
   * The emulator's "session" is a random capability token stored on the
   * order — /pay/test/:token then drives the webhook. */
  async createPaymentSession(order: {
    id: string;
    provider: string;
    totalCents: number;
    currency: string;
    email: string | null;
  }): Promise<{ redirectUrl: string }> {
    const adapter = this.providerRegistry.get(order.provider);
    if (!adapter) {
      // Only registry-registered adapters are reachable — an unknown or
      // unregistered provider id can never be selected by client input.
      throw new BadRequestException('Способ оплаты пока не подключён');
    }
    const result = await adapter.createPaymentSession(order);
    // AuditService.log never throws (failures surface in the server logs
    // with the action name only) — the session must not depend on it.
    await this.auditService.log({
      actor: SYSTEM_ACTOR,
      action: AUDIT_ACTIONS.PAYMENT_CREATED,
      entityType: AUDIT_ENTITY_TYPES.ORDER,
      entityId: order.id,
      metadata: { provider: order.provider },
    });
    return { redirectUrl: result.redirectUrl };
  }

  /** Public data for the emulator page. The token is the capability —
   * knowing it IS the authorization to see the session. */
  async findTestSession(token: string): Promise<TestSessionView> {
    const order = await this.prisma.order.findUnique({
      where: { paymentToken: token },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Платёж не найден');
    }
    return {
      orderId: order.id,
      status: order.status,
      amountCents: order.totalCents,
      currency: order.currency,
      description: order.items.map((item) => item.productTitle).join(', '),
    };
  }

  /**
   * The emulator's server-to-server callback — the same steps a real
   * acquirer webhook goes through: verify the signature, check
   * idempotency, then in one transaction mark the order, decrement the
   * stock and assign the auto-delivery keys.
   */
  async handleTestWebhook(dto: TestWebhookDto): Promise<{ ok: true; status: OrderStatus }> {
    const expected = this.webhookSignature(dto.orderId, dto.paymentToken, dto.status);
    const received = Buffer.from(dto.signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      received.length !== expectedBuffer.length ||
      !timingSafeEqual(received, expectedBuffer)
    ) {
      // The rejection is audited (safe reason only — no header/body values),
      // then the caller gets a 401.
      await this.auditService.log({
        actor: SYSTEM_ACTOR,
        action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED,
        entityType: AUDIT_ENTITY_TYPES.ORDER,
        entityId: dto.orderId,
        metadata: { provider: 'test', reason: 'signature_mismatch' },
      });
      throw new UnauthorizedException('Подпись вебхука неверна');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            product: {
              select: { instruction: true, creditingMode: true },
            },
          },
        },
        user: { select: { email: true, name: true } },
      },
    });
    if (!order || order.paymentToken !== dto.paymentToken) {
      await this.auditService.log({
        actor: SYSTEM_ACTOR,
        action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED,
        entityType: AUDIT_ENTITY_TYPES.ORDER,
        entityId: dto.orderId,
        metadata: { provider: 'test', reason: 'order_or_token_mismatch' },
      });
      throw new NotFoundException('Заказ не найден');
    }
    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      // Idempotent replay (the emulator page may double-submit).
      return { ok: true, status: order.status };
    }

    if (dto.status === 'cancel') {
      // Cancel + stock release + audit commit or roll back together.
      const cancelled = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT },
          data: { status: OrderStatus.CANCELLED },
        });
        if (claimed.count === 0) {
          // A duplicate cancel lost the race — the earlier cancel already
          // returned the reservation; no double-credit possible.
          return null;
        }
        // The creation-time reservation is returned only by the winner of
        // the claim, so a duplicate cancel can never double-credit stock.
        for (const item of order.items) {
          if (item.product.creditingMode === 'AUTO_CODE') {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
        await this.auditService.logInTransaction(tx, {
          actor: SYSTEM_ACTOR,
          action: AUDIT_ACTIONS.PAYMENT_CANCELED,
          entityType: AUDIT_ENTITY_TYPES.ORDER,
          entityId: order.id,
          metadata: { provider: order.provider },
        });
        return { id: order.id };
      });
      if (!cancelled) {
        return { ok: true, status: order.status };
      }
      return { ok: true, status: OrderStatus.CANCELLED };
    }

    // The AWAITING_PAYMENT -> PAID transition is the fulfillment gate: the
    // conditional update claims the order atomically, so two concurrent
    // webhooks can never double-issue keys. Stock is NOT decremented
    // here — the creation-time reservation already removed the units,
    // and a re-decrement would double-charge the reserved stock.
    const fulfilled = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });
      if (claimed.count === 0) {
        return null;
      }
      // The payment lifecycle event commits atomically with the order
      // transition: a paid order can never exist without its audit row.
      await this.auditService.logInTransaction(tx, {
        actor: SYSTEM_ACTOR,
        action: AUDIT_ACTIONS.PAYMENT_SUCCEEDED,
        entityType: AUDIT_ENTITY_TYPES.ORDER,
        entityId: order.id,
        metadata: { provider: order.provider },
      });
      for (const item of order.items) {
        // AUTO_CODE products deliver from the key pool (the units were
        // already reserved at order creation); MANUAL top-ups are
        // fulfilled by the operator — no stock, no keys.
        if (item.product.creditingMode !== 'AUTO_CODE') {
          continue;
        }
        const freeKeys = await tx.productKey.findMany({
          where: { productId: item.productId, isSold: false, orderItemId: null },
          orderBy: { createdAt: 'asc' },
          take: item.quantity,
          select: { id: true },
        });
        if (freeKeys.length < item.quantity) {
          // The reservation guaranteed availability at order creation; a
          // shortfall now means keys were removed manually. There is no
          // refund workflow yet — the paid order stays PAID and the gap
          // is surfaced in the logs for operator handling.
          this.logger.warn(
            `Order ${order.id}: only ${freeKeys.length} of ${item.quantity} keys available for product ${item.productId}`,
          );
        }
        if (freeKeys.length > 0) {
          await tx.productKey.updateMany({
            where: { id: { in: freeKeys.map((key) => key.id) }, isSold: false },
            data: { isSold: true, orderItemId: item.id },
          });
        }
      }
      return { id: order.id };
    });

    if (!fulfilled) {
      // A concurrent webhook won the race and already fulfilled the order.
      return { ok: true, status: OrderStatus.PAID };
    }

    const fresh = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: { select: { instruction: true, title: true, creditingMode: true } },
            keys: { select: { value: true } },
          },
        },
      },
    });
    if (fresh) {
      const recipient = order.email ?? order.user?.email;
      const lines = fresh.items.map((item) => {
        const head =
          `${item.productTitle}` +
          (item.variantLabel ? ` (${item.variantLabel})` : ` × ${item.quantity}`) +
          (item.accountIdentifier ? `\nАккаунт: ${item.accountIdentifier}` : '');
        if (item.keys.length > 0) {
          return `${head}\nКлючи:\n${item.keys.map((key) => `  ${key.value}`).join('\n')}`;
        }
        if (item.product.creditingMode === 'MANUAL') {
          return `${head}\nЗаказ передан оператору — зачисление в течение рабочего дня.`;
        }
        return `${head}\nВыдача: ${item.product.instruction ?? 'ключи будут добавлены администратором'}`;
      });
      if (recipient) {
        await this.mail.queue({
          orderId: fresh.id,
          to: recipient,
          subject: `GPort — заказ оплачен`,
          body: `Заказ ${fresh.id} оплачен.\n\n${lines.join('\n\n')}\n\nДоступно в личном кабинете: /dashboard/orders`,
        });
      }
    }
    this.logger.log(`Order ${fulfilled.id} paid via test acquiring`);
    return { ok: true, status: OrderStatus.PAID };
  }

  /** Recent outbox letters for the admin store-settings check. */
  findEmails(limit = 20) {
    return this.prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }

  private sanitizeProviders(raw: unknown): Record<string, ProviderConfigView> {
    const result: Record<string, ProviderConfigView> = {};
    if (!raw || typeof raw !== 'object') return result;
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      const meta = PAYMENT_PROVIDERS.find((provider) => provider.id === id);
      if (!meta || !value || typeof value !== 'object') continue;
      const { enabled, config } = value as {
        enabled?: unknown;
        config?: unknown;
      };
      const clean: Record<string, string> = {};
      if (config && typeof config === 'object') {
        for (const field of meta.fields) {
          const entry = (config as Record<string, unknown>)[field.key];
          if (typeof entry === 'string' && entry.length <= 300) {
            clean[field.key] = entry;
          }
        }
      }
      result[id] = { enabled: enabled === true, config: clean };
    }
    return result;
  }

  private webhookSignature(orderId: string, token: string, status: string): string {
    return createHmac(
      'sha256',
      this.configService.get<string>('paymentsWebhookSecret') ?? DEV_WEBHOOK_SECRET,
    )
      .update(`${orderId}:${token}:${status}`)
      .digest('hex');
  }

  /** The emulator is a test-only way to pay: production refuses it unless
   * PAYMENTS_ALLOW_TEST_EMULATOR=true is set explicitly (M-PAYMENTS-1 §8). */
  private testEmulatorAllowed(): boolean {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return this.configService.get<boolean>('paymentsAllowTestEmulator') === true;
  }
}

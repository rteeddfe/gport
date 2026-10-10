import { createHmac } from 'node:crypto';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import type { TestWebhookDto } from './dto/test-webhook.dto.js';

const ORDER_ID = '00000000-0000-0000-0000-0000000000bb';
const TOKEN = 'test-payment-token';

function makePrismaMock() {
  return {
    paymentSettings: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    product: { update: vi.fn() },
    productKey: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    emailLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(mock: PrismaMock, env: { nodeEnv?: string; allowEmulator?: string } = {}) {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'paymentsAllowTestEmulator') {
        return env.allowEmulator === 'true';
      }
      return undefined;
    }),
  };
  const mail = { queue: vi.fn().mockResolvedValue(undefined) };
  const audit = { log: vi.fn(async () => {}), logInTransaction: vi.fn(async () => {}) };
  const registry = { get: vi.fn().mockReturnValue(null) };
  const service = new PaymentsService(
    mock as never,
    config as never,
    mail as never,
    audit as never,
    registry as never,
  );
  // Default transaction passthrough: tests that need a distinct tx mock
  // override this per-test.
  mock.$transaction.mockImplementation(async (work: (tx: PrismaMock) => unknown) =>
    work(mock),
  );
  process.env.NODE_ENV = env.nodeEnv ?? 'test';
  return { service, mail, config, audit, registry };
}

afterEach(() => {
  process.env.NODE_ENV = 'test';
});

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    status: 'AWAITING_PAYMENT',
    totalCents: 250_000,
    currency: 'RUB',
    provider: 'test',
    paymentToken: TOKEN,
    paidAt: null,
    user: { email: 'buyer@gport.local', name: null },
    items: [
      {
        id: 'item-1',
        productId: '00000000-0000-0000-0000-000000000001',
        productTitle: 'Cyberpunk 2077',
        unitPriceCents: 250_000,
        quantity: 1,
        product: { instruction: 'Активируйте в Steam' },
      },
    ],
    ...overrides,
  };
}

function sign(status: 'success' | 'cancel', token = TOKEN): string {
  return createHmac('sha256', 'dev-test-acquiring-secret')
    .update(`${ORDER_ID}:${token}:${status}`)
    .digest('hex');
}

function makeDto(status: 'success' | 'cancel', token = TOKEN): TestWebhookDto {
  return { orderId: ORDER_ID, paymentToken: token, status, signature: sign(status, token) };
}

describe('PaymentsService.handleTestWebhook', () => {
  it('rejects a bad signature and audits the rejection', async () => {
    const mock = makePrismaMock();
    const { service, audit } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    const forged = makeDto('success');
    forged.signature = 'nope';
    await expect(service.handleTestWebhook(forged)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook_rejected',
        metadata: { provider: 'test', reason: 'signature_mismatch' },
      }),
    );
  });

  it('rejects an order/token mismatch and audits it', async () => {
    const mock = makePrismaMock();
    const { service, audit } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.handleTestWebhook(makeDto('success', 'other-token'))).rejects.toThrow(
      NotFoundException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook_rejected',
        metadata: { provider: 'test', reason: 'order_or_token_mismatch' },
      }),
    );
  });

  it('marks the order paid, assigns keys without re-decrementing the reserved stock and audits success atomically', async () => {
    const mock = makePrismaMock();
    const { service, mail, audit } = makeService(mock);
    mock.order.findUnique
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce({
        ...makeOrder({ status: 'PAID' }),
        items: [
          {
            id: 'item-1',
            productId: '00000000-0000-0000-0000-000000000001',
            productTitle: 'Cyberpunk 2077',
            quantity: 1,
            product: { instruction: null, title: 'Cyberpunk 2077' },
            keys: [{ value: 'KEY-1' }],
          },
        ],
      });
    const txOrderUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const txProductUpdate = vi.fn().mockResolvedValue({ id: 'p1' });
    mock.$transaction.mockImplementation(async (work) =>
      work({
        order: { updateMany: txOrderUpdate },
        product: { update: txProductUpdate },
        productKey: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'key-1' }, { id: 'key-2' }]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      } as never),
    );

    const result = await service.handleTestWebhook(makeDto('success'));

    expect(result).toEqual({ ok: true, status: 'PAID' });
    // The stock was reserved at order creation — fulfillment must not
    // decrement it a second time.
    expect(txProductUpdate).not.toHaveBeenCalled();
    const mailCall = mail.queue.mock.calls[0][0];
    expect(mailCall.subject).toContain('оплачен');
    expect(mailCall.body).toContain('KEY-1');
    // Success audit rides the SAME transaction as the PAID transition.
    expect(audit.logInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ order: expect.anything() }),
      expect.objectContaining({ action: 'payment.succeeded' }),
    );
  });

  it('is idempotent for an already paid order', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder({ status: 'PAID' }));
    const result = await service.handleTestWebhook(makeDto('success'));
    expect(result).toEqual({ ok: true, status: 'PAID' });
    expect(mock.$transaction).not.toHaveBeenCalled();
  });

  it('does not double-issue keys when a concurrent webhook claimed the order first', async () => {
    const mock = makePrismaMock();
    const { service, mail } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    mock.$transaction.mockImplementation(async (work) =>
      work({
        // The conditional transition loses the race: the order is already PAID.
        order: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        product: { update: vi.fn() },
        productKey: { findMany: vi.fn(), updateMany: vi.fn() },
      } as never),
    );
    const result = await service.handleTestWebhook(makeDto('success'));
    expect(result).toEqual({ ok: true, status: 'PAID' });
    expect(mock.$transaction).toHaveBeenCalledTimes(1);
    expect(mail.queue).not.toHaveBeenCalled();
  });

  it('cancels the order on the cancel callback and audits it', async () => {
    const mock = makePrismaMock();
    const { service, audit } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    mock.order.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.handleTestWebhook(makeDto('cancel'));
    expect(result).toEqual({ ok: true, status: 'CANCELLED' });
    expect(audit.logInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'payment.canceled' }),
    );
  });

  it('returns the reserved stock to the pool on cancel', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    // The AUTO_CODE order held 2 reserved units at creation.
    mock.order.findUnique.mockResolvedValue(
      makeOrder({
        items: [
          {
            id: 'item-1',
            productId: '00000000-0000-0000-0000-000000000001',
            productTitle: 'Cyberpunk 2077',
            quantity: 2,
            product: { instruction: null, creditingMode: 'AUTO_CODE' },
          },
        ],
      }),
    );
    mock.order.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.handleTestWebhook(makeDto('cancel'));
    expect(result).toEqual({ ok: true, status: 'CANCELLED' });
    expect(mock.product.update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      data: { stock: { increment: 2 } },
    });
  });

  it('a duplicate cancel never double-credits the stock', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder({ status: 'CANCELLED' }));
    // Idempotent replay: the early status return happens before any
    // stock mutation.
    const result = await service.handleTestWebhook(makeDto('cancel'));
    expect(result).toEqual({ ok: true, status: 'CANCELLED' });
    expect(mock.product.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown order', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(null);
    await expect(service.handleTestWebhook(makeDto('success'))).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('PaymentsService provider selection (M-PAYMENTS-1)', () => {
  it('rejects an unregistered provider', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    await expect(
      service.createPaymentSession({
        id: ORDER_ID,
        provider: 'tbank',
        totalCents: 100,
        currency: 'RUB',
        email: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('disables the emulator in production unless explicitly allowed', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock, { nodeEnv: 'production' });
    mock.paymentSettings.findUnique.mockResolvedValue({ id: 1, testEnabled: true, providers: {}, updatedAt: new Date() });
    await expect(service.isEnabled('test')).resolves.toBe(false);
    await expect(service.listEnabled()).resolves.toEqual([]);
  });

  it('allows the emulator in production only with the explicit flag', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock, { nodeEnv: 'production', allowEmulator: 'true' });
    mock.paymentSettings.findUnique.mockResolvedValue({ id: 1, testEnabled: true, providers: {}, updatedAt: new Date() });
    await expect(service.isEnabled('test')).resolves.toBe(true);
  });

  it('a disabled emulator toggle is honored in non-production', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock, { nodeEnv: 'development' });
    mock.paymentSettings.findUnique.mockResolvedValue({ id: 1, testEnabled: false, providers: {}, updatedAt: new Date() });
    await expect(service.isEnabled('test')).resolves.toBe(false);
  });

  it('a non-live provider cannot be enabled from settings alone', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.paymentSettings.findUnique.mockResolvedValue({
      id: 1,
      testEnabled: false,
      providers: { tbank: { enabled: true, config: {} } },
      updatedAt: new Date(),
    });
    await expect(service.isEnabled('tbank')).resolves.toBe(false);
  });
});

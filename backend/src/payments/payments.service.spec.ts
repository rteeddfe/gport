import { createHmac } from 'node:crypto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    $transaction: vi.fn(async (work) => work(makeTxMock())),
  };
}

function makeTxMock() {
  return {
    order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    product: { update: vi.fn() },
    productKey: { findMany: vi.fn(), updateMany: vi.fn() },
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(mock: PrismaMock) {
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const mail = { queue: vi.fn().mockResolvedValue(undefined) };
  const service = new PaymentsService(
    mock as never,
    config as never,
    mail as never,
  );
  return { service, mail, config };
}

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
  it('rejects a bad signature', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    await expect(
      // Spreading a plain DTO literal, not a class instance.
      // oxlint-disable-next-line typescript(no-misused-spread)
      service.handleTestWebhook({ ...makeDto('success'), signature: 'nope' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('marks the order paid, decrements stock and assigns keys', async () => {
    const mock = makePrismaMock();
    const { service, mail } = makeService(mock);
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
    const tx = makeTxMock();
    mock.$transaction.mockImplementation(async (work) =>
      work({
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        product: {
          update: vi.fn().mockResolvedValue({ id: 'p1', stock: 4 }),
        },
        productKey: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'key-1' }, { id: 'key-2' }]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      }),
    );
    void tx;

    const result = await service.handleTestWebhook(makeDto('success'));

    expect(result).toEqual({ ok: true, status: 'PAID' });
    const mailCall = mail.queue.mock.calls[0][0];
    expect(mailCall.subject).toContain('оплачен');
    expect(mailCall.body).toContain('KEY-1');
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
      }),
    );
    const result = await service.handleTestWebhook(makeDto('success'));
    expect(result).toEqual({ ok: true, status: 'PAID' });
    expect(mock.$transaction).toHaveBeenCalledTimes(1);
    expect(mail.queue).not.toHaveBeenCalled();
  });

  it('cancels the order on the cancel callback', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.order.findUnique.mockResolvedValue(makeOrder());
    mock.order.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.handleTestWebhook(makeDto('cancel'));
    expect(result).toEqual({ ok: true, status: 'CANCELLED' });
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

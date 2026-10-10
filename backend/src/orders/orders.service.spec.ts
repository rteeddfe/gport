import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Product, User } from '../generated/prisma/client.js';
import { OrdersService } from './orders.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

function makePrismaMock() {
  return {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn(), create: vi.fn() },
    product: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    promoCode: {
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    emailLog: { create: vi.fn() },
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(
  mock: PrismaMock,
  promo: {
    resolveForCheckout?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const payments = {
    isEnabled: vi.fn().mockResolvedValue(true),
    createPaymentSession: vi
      .fn()
      .mockResolvedValue({ redirectUrl: 'http://localhost:3000/pay/test/tok' }),
  };
  const mail = { queue: vi.fn().mockResolvedValue(undefined) };
  const promoCodesService = {
    resolveForCheckout:
      promo.resolveForCheckout ??
      vi.fn().mockResolvedValue({
        promo: {
          id: '00000000-0000-0000-0000-0000000000f1',
          code: 'WELCOME10',
          maxUses: 5,
        },
        discountCents: 12_990,
        totalCents: 116_910,
      }),
  };
  const service = new OrdersService(
    mock as never,
    payments as never,
    mail as never,
    promoCodesService as never,
  );
  // Interactive transactions run against the same mock in tests.
  mock.$transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
    work(mock as never),
  );
  return { service, payments, mail, promoCodesService };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    description: null,
    instruction: 'Активируйте в Steam',
    platform: null,
    genre: [],
    images: [],
    priceCents: 250_000,
    oldPriceCents: null,
    discountPercent: 0,
    cashbackPercent: 0,
    releaseYear: null,
    rating: null,
    consoles: [],
    tags: [],
    tagline: null,
    group: null,
    features: [],
    searchAliases: [],
    systemRequirements: null,
    kind: 'GAME_KEY',
    creditingMode: 'AUTO_CODE',
    stock: 5,
    status: 'PUBLISHED',
    categoryId: '00000000-0000-0000-0000-000000000010',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Product;
}

const USER: Pick<User, 'id' | 'email'> = {
  id: '00000000-0000-0000-0000-0000000000aa',
  email: 'buyer@gport.local',
};

const DTO: CreateOrderDto = {
  productId: '00000000-0000-0000-0000-000000000001',
  quantity: 2,
  provider: 'test',
};

describe('OrdersService.create', () => {
  it('snapshots the price, opens a payment session and queues the letter', async () => {
    const mock = makePrismaMock();
    const { service, payments, mail } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000bb',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    const result = await service.create(USER.id, DTO);

    expect(result.totalCents).toBe(500_000);
    expect(result.items[0].unitPriceCents).toBe(250_000);
    expect(result.redirectUrl).toContain('/pay/test/');
    expect(payments.createPaymentSession).toHaveBeenCalled();
    expect(mail.queue).toHaveBeenCalledTimes(1);
    const letter = mail.queue.mock.calls[0][0];
    expect(letter.subject).toContain('счёт');
    expect(letter.body).toContain('Cyberpunk 2077 × 2');
  });

  it('rejects an unpublished product', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(
      makeProduct({ status: 'DRAFT' }),
    );
    await expect(service.create(USER.id, DTO)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects a quantity above the stock', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct({ stock: 1 }));
    // The conditional reservation finds no unit to decrement.
    mock.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.create(USER.id, DTO)).rejects.toThrow(
      BadRequestException,
    );
    // The order is never created: the failed reservation aborts the
    // transaction, so no unpaid order holds the product hostage.
    expect(mock.order.create).not.toHaveBeenCalled();
  });

  it('reserves stock with an atomic conditional decrement at creation', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct({ stock: 1 }));
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000bb',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    const result = await service.create(USER.id, { ...DTO, quantity: 1 });

    expect(result.status).toBe('AWAITING_PAYMENT');
    // check + write in ONE statement: WHERE stock >= quantity.
    expect(mock.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: '00000000-0000-0000-0000-000000000001',
        stock: { gte: 1 },
      },
      data: { stock: { decrement: 1 } },
    });
  });

  it('a concurrent order that loses the reservation cannot create the order', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    // stock=1: the first concurrent order reserved the last unit.
    mock.product.findUnique.mockResolvedValue(makeProduct({ stock: 1 }));
    mock.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create(USER.id, { ...DTO, quantity: 1 }),
    ).rejects.toThrow(BadRequestException);
    expect(mock.order.create).not.toHaveBeenCalled();
  });

  it('releases a stale abandoned reservation before reserving', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());
    // An abandoned checkout from 31 minutes ago still holds its unit.
    mock.order.findMany.mockResolvedValue([
      {
        id: 'stale-order-1',
        items: [
          {
            quantity: 1,
            product: { creditingMode: 'AUTO_CODE' },
          },
        ],
      },
    ]);
    mock.order.updateMany.mockResolvedValue({ count: 1 });
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000bb',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    await service.create(USER.id, { ...DTO, quantity: 1 });

    // The stale order is claimed as CANCELLED…
    expect(mock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stale-order-1', status: 'AWAITING_PAYMENT' },
        data: { status: 'CANCELLED' },
      }),
    );
    // …and its reserved unit is returned to stock.
    expect(mock.product.update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      data: { stock: { increment: 1 } },
    });
  });

  it('rejects a disabled payment provider', async () => {
    const mock = makePrismaMock();
    const { service, payments } = makeService(mock);
    payments.isEnabled.mockResolvedValue(false);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());
    await expect(service.create(USER.id, DTO)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a guest order without an email', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    await expect(
      service.create(null, { ...DTO, email: undefined }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a passwordless holder account for a guest and attaches the order', async () => {
    const mock = makePrismaMock();
    const { service, mail } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(null); // no account with the email
    mock.user.create.mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000cc' });
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000dd',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    const result = await service.create(null, {
      ...DTO,
      email: '  Guest@Mail.RU ',
    });

    expect(mock.user.create).toHaveBeenCalledWith({
      data: { email: 'guest@mail.ru', passwordHash: null },
      select: { id: true },
    });
    expect(mock.order.create.mock.calls[0][0].data.userId).toBe(
      '00000000-0000-0000-0000-0000000000cc',
    );
    expect(result.redirectUrl).toContain('/pay/test/');
    // The letter carries the normalized guest email.
    expect(mail.queue.mock.calls[0][0].to).toBe('guest@mail.ru');
  });

  it('a guest checkout with the email of a REGISTERED account attaches to nobody (userId null)', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    // An existing REGISTERED account (password set) — the guest order must
    // never attach to someone else's profile.
    mock.user.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-0000000000ee',
      email: 'buyer@gport.local',
      passwordHash: '$argon2id$hash',
    });
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000dd',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    await service.create(null, { ...DTO, email: 'buyer@gport.local' });

    expect(mock.user.create).not.toHaveBeenCalled();
    expect(mock.order.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it('a signed-in buyer attaches the order to their own id — the M-PAYMENTS-1 regression (the guard previously left the request anonymous here)', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue({
      id: USER.id,
      email: USER.email,
      passwordHash: '$argon2id$hash',
    });
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000dd',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [
        {
          id: 'item-1',
          productTitle: data.items.create[0].productTitle,
          unitPriceCents: data.items.create[0].unitPriceCents,
          quantity: data.items.create[0].quantity,
          product: { slug: 'cyberpunk-2077', images: [], instruction: null },
          keys: [],
        },
      ],
    }));

    await service.create(USER.id, DTO);

    expect(mock.order.create.mock.calls[0][0].data.userId).toBe(USER.id);
  });
});

describe('OrdersService.create — promo consumption (M-2)', () => {
  it('consumes a usage atomically inside the order transaction (normal usage)', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000bb',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [],
    }));

    const result = await service.create(USER.id, { ...DTO, promoCode: 'welcome10' });

    expect(result.totalCents).toBe(500_000 - 12_990);
    // The authoritative consume is conditional and lives INSIDE the tx.
    expect(mock.promoCode.updateMany).toHaveBeenCalledWith({
      where: {
        id: '00000000-0000-0000-0000-0000000000f1',
        isActive: true,
        usedCount: { lt: 5 },
      },
      data: { usedCount: { increment: 1 } },
    });
    // The post-commit blind increment is gone.
    expect(mock.promoCode.update).not.toHaveBeenCalled();
  });

  it('uses the last available slot and rejects when it is gone (stale validation)', async () => {
    const mock = makePrismaMock();
    // resolveForCheckout saw usedCount=0 of maxUses=1 (stale UX read),
    // but the conditional consume finds the slot taken.
    const { service } = makeService(mock, {
      resolveForCheckout: vi.fn().mockResolvedValue({
        promo: {
          id: '00000000-0000-0000-0000-0000000000f1',
          code: 'LAST1',
          maxUses: 1,
        },
        discountCents: 10_000,
        totalCents: 240_000,
      }),
    });
    mock.promoCode.updateMany.mockResolvedValue({ count: 0 });
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());

    await expect(
      service.create(USER.id, { ...DTO, promoCode: 'LAST1' }),
    ).rejects.toThrow(BadRequestException);
    // The order is NOT created on a lost consume — nothing to pay for.
    expect(mock.order.create).not.toHaveBeenCalled();
  });

  it('unlimited promos consume without a maxUses condition', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock, {
      resolveForCheckout: vi.fn().mockResolvedValue({
        promo: {
          id: '00000000-0000-0000-0000-0000000000f1',
          code: 'FOREVER',
          maxUses: null,
        },
        discountCents: 5_000,
        totalCents: 245_000,
      }),
    });
    mock.user.findUnique.mockResolvedValue(USER);
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.order.create.mockImplementation(async ({ data }) => ({
      id: '00000000-0000-0000-0000-0000000000bb',
      status: 'AWAITING_PAYMENT',
      totalCents: data.totalCents,
      currency: 'RUB',
      provider: data.provider,
      createdAt: new Date(),
      paidAt: null,
      paymentToken: null,
      items: [],
    }));

    await service.create(USER.id, { ...DTO, promoCode: 'FOREVER' });

    expect(mock.promoCode.updateMany).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-0000000000f1', isActive: true },
      data: { usedCount: { increment: 1 } },
    });
  });

  it('a failure after the consume rolls the whole transaction back', async () => {
    const mock = makePrismaMock();
    const { service } = makeService(mock);
    mock.user.findUnique.mockResolvedValue(USER);
    // GAME_KEY product with stock=0: the stock reservation throws AFTER
    // nothing was consumed yet — swap the order of failures instead:
    // let the stock reservation pass and make the ORDER create fail.
    mock.product.findUnique.mockResolvedValue(makeProduct({ stock: 5 }));
    mock.order.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.create(USER.id, { ...DTO, promoCode: 'welcome10' }),
    ).rejects.toThrow('db down');
    // The consume ran inside the failing transaction — in production the
    // rollback undoes it together with the order row; here we assert the
    // consume and the create are in the SAME transaction callback.
    expect(mock.promoCode.updateMany).toHaveBeenCalledTimes(1);
    expect(mock.order.create).toHaveBeenCalledTimes(1);
  });
});

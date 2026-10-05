import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Product, User } from '../generated/prisma/client.js';
import { OrdersService } from './orders.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

function makePrismaMock() {
  return {
    user: { findUnique: vi.fn(), create: vi.fn() },
    product: { findUnique: vi.fn() },
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    emailLog: { create: vi.fn() },
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(mock: PrismaMock) {
  const payments = {
    isEnabled: vi.fn().mockResolvedValue(true),
    createPaymentSession: vi
      .fn()
      .mockResolvedValue({ redirectUrl: 'http://localhost:3000/pay/test/tok' }),
  };
  const mail = { queue: vi.fn().mockResolvedValue(undefined) };
  const service = new OrdersService(
    mock as never,
    payments as never,
    mail as never,
  );
  return { service, payments, mail };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    description: null,
    instruction: 'Активируйте в Steam',
    region: null,
    platform: null,
    genre: [],
    localization: null,
    ageRating: null,
    images: [],
    priceCents: 250_000,
    oldPriceCents: null,
    stock: 5,
    currency: 'RUB',
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
    await expect(service.create(USER.id, DTO)).rejects.toThrow(
      BadRequestException,
    );
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
});

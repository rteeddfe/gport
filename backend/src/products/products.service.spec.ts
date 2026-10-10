import { ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductSort } from './dto/find-products.dto.js';

function makePrismaMock() {
  return {
    product: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findUnique: vi.fn() },
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(mock: PrismaMock): ProductsService {
  return new ProductsService(mock as never);
}

describe('ProductsService.findMany (public catalog)', () => {
  it('forces PUBLISHED and applies filters, sort and pagination', async () => {
    const mock = makePrismaMock();
    mock.product.findMany.mockResolvedValue([]);
    mock.product.count.mockResolvedValue(0);
    await makeService(mock).findMany({
      categorySlug: 'games',
      search: 'elden',
      platform: 'steam',
      genre: 'rpg',
      sale: '1',
      priceMin: 100,
      priceMax: 500,
      sort: ProductSort.PRICE_ASC,
      page: 2,
      limit: 20,
    });
    expect(mock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          category: { slug: 'games' },
          OR: [
            { title: { contains: 'elden', mode: 'insensitive' } },
            { description: { contains: 'elden', mode: 'insensitive' } },
            { searchAliases: { has: 'elden' } },
          ],
          platform: { in: ['steam'] },
          genre: { hasSome: ['rpg'] },
          oldPriceCents: { not: null },
          priceCents: { gte: 100, lte: 500 },
        },
        orderBy: [{ priceCents: 'asc' }, { createdAt: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it('defaults to newest first without filters', async () => {
    const mock = makePrismaMock();
    mock.product.findMany.mockResolvedValue([]);
    mock.product.count.mockResolvedValue(0);
    await makeService(mock).findMany({});
    expect(mock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 10,
      }),
    );
  });

  it('sorts by the cached discount percent for «популярные»/«по скидке»', async () => {
    const mock = makePrismaMock();
    mock.product.findMany.mockResolvedValue([]);
    mock.product.count.mockResolvedValue(0);
    await makeService(mock).findMany({ sort: ProductSort.DISCOUNT });
    expect(mock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ discountPercent: 'desc' }, { createdAt: 'desc' }],
      }),
    );
    await makeService(mock).findMany({ sort: ProductSort.POPULAR });
    expect(mock.product.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  });

  it('passes status through for the admin list', async () => {
    const mock = makePrismaMock();
    mock.product.findMany.mockResolvedValue([]);
    mock.product.count.mockResolvedValue(0);
    await makeService(mock).findManyAdmin({ status: 'DRAFT' });
    expect(mock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'DRAFT' } }),
    );
  });
});

describe('ProductsService.replaceKeys (M-4.1 active-order guard)', () => {
  const KEYS = ['KEY-A', 'KEY-B'];
  const PRODUCT_ID = '00000000-0000-0000-0000-000000000001';

  /** Interactive-transaction mock: order.count answers with the given
   * number of AWAITING_PAYMENT orders, key writes are observable. */
  function mockTx(orderCount: number) {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue({ id: PRODUCT_ID });
    const orderCountTx = vi.fn().mockResolvedValue(orderCount);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    mock.$transaction = vi.fn(async (work: (tx: unknown) => unknown) =>
      work({
        order: { count: orderCountTx },
        productKey: { deleteMany, createMany },
      } as never),
    );
    return { mock, orderCountTx, deleteMany, createMany };
  }

  it('replaces the unsold pool when no order awaits payment', async () => {
    const { mock, deleteMany, createMany } = mockTx(0);
    await makeService(mock).replaceKeys(PRODUCT_ID, KEYS);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { productId: PRODUCT_ID, isSold: false },
    });
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('rejects with 409 while an AWAITING_PAYMENT order needs keys', async () => {
    const { mock, deleteMany, createMany } = mockTx(1);
    await expect(
      makeService(mock).replaceKeys(PRODUCT_ID, KEYS),
    ).rejects.toThrow(ConflictException);
    // Atomicity: nothing was deleted, nothing was inserted — the guard
    // runs before the first write.
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('the guard counts only AUTO_CODE items of this product', async () => {
    const { mock, orderCountTx } = mockTx(0);
    await makeService(mock).replaceKeys(PRODUCT_ID, KEYS);
    // Other products, PAID/CANCELLED orders and MANUAL crediting are
    // excluded by the where shape itself.
    expect(orderCountTx).toHaveBeenCalledWith({
      where: {
        status: 'AWAITING_PAYMENT',
        items: {
          some: {
            productId: PRODUCT_ID,
            product: { creditingMode: 'AUTO_CODE' },
          },
        },
      },
    });
  });

  it('the post-write re-check aborts the replacement when an order appears in between', async () => {
    const { mock, deleteMany, createMany, orderCountTx } = mockTx(0);
    // First check (pre-write) sees none; the re-check (post-write) sees
    // a just-committed checkout — the throw rolls the transaction back.
    orderCountTx.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    await expect(
      makeService(mock).replaceKeys(PRODUCT_ID, KEYS),
    ).rejects.toThrow(ConflictException);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledTimes(1);
    // The caller still sees 409 — the writes never committed.
  });
});

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
      search: 'gothic',
      region: 'RU+CIS',
      platform: 'Steam',
      genre: 'RPG',
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
            { title: { contains: 'gothic', mode: 'insensitive' } },
            { description: { contains: 'gothic', mode: 'insensitive' } },
          ],
          region: 'RU+CIS',
          platform: 'Steam',
          genre: { has: 'RPG' },
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

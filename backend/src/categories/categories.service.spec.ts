import { CategoriesService } from './categories.service.js';

function makePrismaMock() {
  return {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('CategoriesService', () => {
  it('slugifies the name when the slug is not provided', async () => {
    const mock = makePrismaMock();
    mock.category.findUnique.mockResolvedValue(null);
    mock.category.create.mockResolvedValue({
      id: 'uuid',
      name: 'Игровые ключи',
      slug: 'igrovye-klyuchi',
      description: null,
      _count: { products: 0 },
    });

    const service = new CategoriesService(mock as never);
    const result = await service.create({ name: 'Игровые ключи' });

    expect(mock.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'igrovye-klyuchi' }) }),
    );
    expect(result.productsCount).toBe(0);
  });

  it('rejects a duplicate name with 409', async () => {
    const mock = makePrismaMock();
    mock.category.findUnique.mockImplementation(async ({ where }) =>
      where.name === 'Игры' ? { id: 'other', name: 'Игры', slug: 'games' } : null,
    );

    const service = new CategoriesService(mock as never);
    await expect(service.create({ name: 'Игры', slug: 'igry' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('refuses to delete a category that still has products', async () => {
    const mock = makePrismaMock();
    mock.category.findUnique.mockResolvedValue({
      id: 'uuid',
      name: 'Игры',
      slug: 'games',
      description: null,
      _count: { products: 3 },
    });

    const service = new CategoriesService(mock as never);
    await expect(service.remove('uuid')).rejects.toMatchObject({ status: 409 });
    expect(mock.category.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty category', async () => {
    const mock = makePrismaMock();
    mock.category.findUnique.mockResolvedValue({
      id: 'uuid',
      name: 'Пустая',
      slug: 'empty',
      description: null,
      _count: { products: 0 },
    });
    mock.category.delete.mockResolvedValue(undefined);

    const service = new CategoriesService(mock as never);
    await service.remove('uuid');
    expect(mock.category.delete).toHaveBeenCalledWith({ where: { id: 'uuid' } });
  });
});

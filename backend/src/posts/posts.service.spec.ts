import { PostsService } from './posts.service.js';

function makePrismaMock() {
  return {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('PostsService', () => {
  it('slugifies the title and stamps publishedAt on a published create', async () => {
    const mock = makePrismaMock();
    mock.post.findUnique.mockResolvedValue(null);
    mock.post.create.mockResolvedValue({ id: 'uuid', slug: 'novosti-magazina' });

    const service = new PostsService(mock as never);
    await service.create({ title: 'Новости магазина', status: 'PUBLISHED' });

    expect(mock.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'novosti-magazina',
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('leaves publishedAt empty for drafts', async () => {
    const mock = makePrismaMock();
    mock.post.findUnique.mockResolvedValue(null);
    mock.post.create.mockResolvedValue({ id: 'uuid', slug: 'chernovik' });

    const service = new PostsService(mock as never);
    await service.create({ title: 'Черновик' });

    expect(mock.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', publishedAt: null }),
      }),
    );
  });

  it('rejects a duplicate slug with 409', async () => {
    const mock = makePrismaMock();
    mock.post.findUnique.mockResolvedValue({ id: 'other', slug: 'taken' });

    const service = new PostsService(mock as never);
    await expect(
      service.create({ title: 'Вторая новость', slug: 'taken' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('keeps the slug on PATCH without slug and sets publishedAt on first publish', async () => {
    const mock = makePrismaMock();
    mock.post.findUnique
      .mockResolvedValueOnce({
        id: 'uuid',
        title: 'Черновик',
        slug: 'chernovik',
        status: 'DRAFT',
        publishedAt: null,
      })
      .mockResolvedValueOnce(null);
    mock.post.update.mockResolvedValue({ id: 'uuid', slug: 'chernovik' });

    const service = new PostsService(mock as never);
    await service.update('uuid', { status: 'PUBLISHED' });

    expect(mock.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: undefined,
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('public findMany sees PUBLISHED only, ordered by publishedAt', async () => {
    const mock = makePrismaMock();
    mock.post.findMany.mockResolvedValue([]);
    mock.post.count.mockResolvedValue(0);

    const service = new PostsService(mock as never);
    await service.findMany({ page: 1, limit: 10 });

    expect(mock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('refuses to delete a missing post', async () => {
    const mock = makePrismaMock();
    mock.post.findUnique.mockResolvedValue(null);

    const service = new PostsService(mock as never);
    await expect(service.remove('uuid')).rejects.toMatchObject({ status: 404 });
    expect(mock.post.delete).not.toHaveBeenCalled();
  });
});

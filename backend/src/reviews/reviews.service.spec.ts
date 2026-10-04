import { ReviewsService } from './reviews.service.js';

function makePrismaMock() {
  return {
    review: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('ReviewsService', () => {
  it('lands a submission in PENDING and stores the ip', async () => {
    const mock = makePrismaMock();
    mock.review.count.mockResolvedValue(0);
    mock.review.create.mockResolvedValue({ id: 'uuid', status: 'PENDING' });

    const service = new ReviewsService(mock as never);
    await service.create(
      { rating: 5, authorName: '  Анна ', text: 'Всё понравилось, пришло моментально' },
      '1.2.3.4',
    );

    expect(mock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorName: 'Анна',
          rating: 5,
          ip: '1.2.3.4',
        }),
      }),
    );
    // The service never sends a status — the model default (PENDING) gates
    // every submission behind moderation.
    const { data } = mock.review.create.mock.calls[0][0];
    expect(data.status).toBeUndefined();
  });

  it('defaults the empty name to «Гость»', async () => {
    const mock = makePrismaMock();
    mock.review.count.mockResolvedValue(0);
    mock.review.create.mockResolvedValue({ id: 'uuid' });

    const service = new ReviewsService(mock as never);
    await service.create({ rating: 4, text: 'Хороший магазин, всё быстро' }, '1.2.3.4');

    expect(mock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorName: 'Гость' }) }),
    );
  });

  it('rejects the second review from one ip within a minute (429)', async () => {
    const mock = makePrismaMock();
    mock.review.count.mockImplementation(async ({ where }) =>
      'ip' in where ? 1 : 0,
    );

    const service = new ReviewsService(mock as never);
    await expect(
      service.create({ rating: 5, text: 'Попытка отправить второй отзыв' }, '1.2.3.4'),
    ).rejects.toMatchObject({ status: 429 });
    expect(mock.review.create).not.toHaveBeenCalled();
  });

  it('rejects submissions once 40 reviews were left within an hour (429)', async () => {
    const mock = makePrismaMock();
    mock.review.count.mockImplementation(async ({ where }) =>
      'ip' in where ? 0 : 40,
    );

    const service = new ReviewsService(mock as never);
    await expect(
      service.create({ rating: 5, text: 'Сорок первый отзыв за час' }, '5.6.7.8'),
    ).rejects.toMatchObject({ status: 429 });
    expect(mock.review.create).not.toHaveBeenCalled();
  });

  it('skips the per-ip limit when the ip is unknown but keeps the global one', async () => {
    const mock = makePrismaMock();
    mock.review.count.mockResolvedValue(0);
    mock.review.create.mockResolvedValue({ id: 'uuid' });

    const service = new ReviewsService(mock as never);
    await service.create({ rating: 3, text: 'Без ip — глобальный лимит активен' }, null);

    expect(mock.review.count).toHaveBeenCalledTimes(1);
    expect(mock.review.create).toHaveBeenCalled();
  });

  it('public findMany sees PUBLISHED only, newest first', async () => {
    const mock = makePrismaMock();
    mock.review.findMany.mockResolvedValue([]);
    mock.review.count.mockResolvedValue(0);

    const service = new ReviewsService(mock as never);
    await service.findMany({ page: 1, limit: 10 });

    expect(mock.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('publishes a pending review and refuses to touch a missing one', async () => {
    const mock = makePrismaMock();
    mock.review.findUnique
      .mockResolvedValueOnce({ id: 'uuid', status: 'PENDING' })
      .mockResolvedValueOnce(null);
    mock.review.update.mockResolvedValue({ id: 'uuid', status: 'PUBLISHED' });

    const service = new ReviewsService(mock as never);
    await service.update('uuid', { status: 'PUBLISHED' });
    expect(mock.review.update).toHaveBeenCalledWith({
      where: { id: 'uuid' },
      data: { status: 'PUBLISHED', rating: undefined, text: undefined },
    });

    await expect(service.update('missing', { status: 'PUBLISHED' })).rejects.toMatchObject({
      status: 404,
    });
    expect(mock.review.update).toHaveBeenCalledTimes(1);
  });

  it('edits the content of a review without touching the status', async () => {
    const mock = makePrismaMock();
    mock.review.findUnique.mockResolvedValue({ id: 'uuid', status: 'PUBLISHED' });
    mock.review.update.mockResolvedValue({ id: 'uuid' });

    const service = new ReviewsService(mock as never);
    await service.update('uuid', {
      authorName: '  Игорь  ',
      rating: 3,
      text: 'Исправленный текст отзыва модератором',
    });

    expect(mock.review.update).toHaveBeenCalledWith({
      where: { id: 'uuid' },
      data: {
        status: undefined,
        rating: 3,
        text: 'Исправленный текст отзыва модератором',
        authorName: 'Игорь',
      },
    });
  });

  it('falls back to «Гость» when the admin clears the name', async () => {
    const mock = makePrismaMock();
    mock.review.findUnique.mockResolvedValue({ id: 'uuid' });
    mock.review.update.mockResolvedValue({ id: 'uuid' });

    const service = new ReviewsService(mock as never);
    await service.update('uuid', { authorName: '   ' });

    expect(mock.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorName: 'Гость' }) }),
    );
  });
});

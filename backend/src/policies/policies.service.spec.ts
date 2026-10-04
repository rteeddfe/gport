import { ConflictException, NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service.js';

const makeService = (overrides: Record<string, unknown> = {}) =>
  new PoliciesService({ policyPage: overrides } as never);

describe('PoliciesService', () => {
  it('sanitizes dangerous HTML before create', async () => {
    let stored = '';
    const service = makeService({
      findUnique: async () => null,
      create: async ({ data }: { data: { content: string } }) => {
        stored = data.content;
        return { id: 'p1', slug: 'x', title: 'X', content: stored, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
      },
    });

    await service.create({
      slug: 'x',
      title: 'X',
      content:
        '<p>ok</p><script>alert(1)</script><h2>head</h2><a href="https://x.com" onclick="evil()">link</a>',
    });

    expect(stored).toContain('<p>ok</p>');
    expect(stored).toContain('<h2>head</h2>');
    expect(stored).not.toContain('<script>');
    expect(stored).not.toContain('onclick');
    expect(stored).toContain('rel="noopener noreferrer nofollow"');
  });

  it('sanitizes on update as well', async () => {
    let stored = '';
    const service = makeService({
      findUnique: async () => null,
      update: async ({ data }: { data: { content: string } }) => {
        stored = data.content ?? '';
        return { id: 'p1', content: stored };
      },
    });

    await service.update('p1', { content: '<img src=x onerror=alert(1)><b>bold</b>' });
    expect(stored).not.toContain('onerror');
    expect(stored).toContain('<b>bold</b>');
  });

  it('throws NotFound when the slug does not exist', async () => {
    const service = makeService({ findUnique: async () => null });
    await expect(service.findBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('throws Conflict when creating an existing slug', async () => {
    const service = makeService({
      findUnique: async () => ({ id: 'existing' }),
      create: async () => ({}),
    });
    await expect(
      service.create({ slug: 'privacy', title: 'T', content: '<p>x</p>' }),
    ).rejects.toThrow(ConflictException);
  });
});

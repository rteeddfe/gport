import type { PromoCode } from '../generated/prisma/client.js';
import {
  computeDiscountCents,
  isPromoActiveNow,
  PromoCodesService,
} from './promo-codes.service.js';

function makePrismaMock() {
  return {
    promoCode: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'WELCOME10',
    discountType: 'PERCENT',
    value: 10,
    isActive: true,
    startsAt: null,
    endsAt: null,
    maxUses: null,
    usedCount: 0,
    minSubtotalCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('isPromoActiveNow', () => {
  it('accepts an active promo without windows', () => {
    expect(isPromoActiveNow(makePromo())).toBe(true);
  });

  it('rejects an inactive promo', () => {
    expect(isPromoActiveNow(makePromo({ isActive: false }))).toBe(false);
  });

  it('rejects a promo that has not started yet', () => {
    expect(
      isPromoActiveNow(
        makePromo({ startsAt: new Date(Date.now() + 60_000) }),
      ),
    ).toBe(false);
  });

  it('rejects an expired promo', () => {
    expect(
      isPromoActiveNow(makePromo({ endsAt: new Date(Date.now() - 60_000) })),
    ).toBe(false);
  });

  it('rejects a promo whose usage limit is exhausted', () => {
    expect(isPromoActiveNow(makePromo({ maxUses: 5, usedCount: 5 }))).toBe(
      false,
    );
  });
});

describe('computeDiscountCents', () => {
  it('floors a percent discount', () => {
    expect(computeDiscountCents('PERCENT', 10, 12_345)).toBe(1_234);
  });

  it('subtracts a fixed discount', () => {
    expect(computeDiscountCents('FIXED', 5_000, 12_345)).toBe(5_000);
  });

  it('caps a fixed discount at the subtotal', () => {
    expect(computeDiscountCents('FIXED', 99_999, 12_345)).toBe(12_345);
  });

  it('returns zero for an empty cart', () => {
    expect(computeDiscountCents('PERCENT', 10, 0)).toBe(0);
  });
});

describe('PromoCodesService.update', () => {
  it('clears endsAt when null is sent and leaves other fields untouched', async () => {
    const mock = makePrismaMock();
    const existing = makePromo({
      endsAt: new Date('2030-01-01T00:00:00Z'),
      maxUses: 10,
    });
    mock.promoCode.findUnique.mockResolvedValue(existing);
    mock.promoCode.update.mockResolvedValue(existing);
    const service = new PromoCodesService(mock as never);

    await service.update(existing.id, { endsAt: null });

    const { data } = mock.promoCode.update.mock.calls[0][0];
    expect(data.endsAt).toBeNull();
    expect(data.code).toBeUndefined();
    expect(data.maxUses).toBeUndefined();
  });

  it('throws 404 for a missing promo', async () => {
    const mock = makePrismaMock();
    mock.promoCode.findUnique.mockResolvedValue(null);
    const service = new PromoCodesService(mock as never);

    await expect(service.update('no-such-id', {})).rejects.toMatchObject({
      status: 404,
    });
  });
});

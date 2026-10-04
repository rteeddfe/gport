import type { Cart, CartItem, Product, PromoCode } from '../generated/prisma/client.js';
import { CartService, type CartIdentity } from './cart.service.js';

function makePrismaMock() {
  return {
    product: { findUnique: vi.fn() },
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    promoCode: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeService(mock: PrismaMock): CartService {
  return new CartService(mock as never);
}

/** Anonymous visitor without a cookie yet. */
const ANON: CartIdentity = {};
/** Guest whose cart is tracked by the cart_token cookie. */
const GUEST: CartIdentity = { guestToken: 'guest-token' };

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Gothic 1 Remake',
    slug: 'gothic-1-remake',
    description: null,
    instruction: null,
    region: 'RU+CIS',
    platform: 'Steam',
    genre: ['RPG'],
    localization: 'RU',
    ageRating: '16+',
    images: [],
    priceCents: 170_000,
    oldPriceCents: null,
    currency: 'RUB',
    status: 'PUBLISHED',
    categoryId: '00000000-0000-0000-0000-000000000010',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Product;
}

function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: '00000000-0000-0000-0000-0000000000aa',
    userId: null,
    guestToken: 'guest-token',
    appliedPromoCodeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Cart;
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: '00000000-0000-0000-0000-0000000000b1',
    cartId: '00000000-0000-0000-0000-0000000000aa',
    productId: '00000000-0000-0000-0000-000000000001',
    quantity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as CartItem;
}

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: '00000000-0000-0000-0000-0000000000c1',
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
  } as PromoCode;
}

describe('CartService.addItem', () => {
  it('rejects a missing product', async () => {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue(null);
    const service = makeService(mock);
    await expect(
      service.addItem(GUEST, { productId: 'nope' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects an unpublished product', async () => {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue(makeProduct({ status: 'DRAFT' }));
    const service = makeService(mock);
    await expect(
      service.addItem(GUEST, { productId: 'p1' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('creates a guest cart and returns the token for the cookie', async () => {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.cart.create.mockResolvedValue(makeCart());
    mock.cartItem.findUnique.mockResolvedValue(null);
    mock.cartItem.findMany.mockResolvedValue([
      { ...makeItem(), product: makeProduct() },
    ]);
    const result = await makeService(mock).addItem(ANON, {
      productId: '00000000-0000-0000-0000-000000000001',
    });
    expect(mock.cart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { guestToken: expect.any(String) } }),
    );
    expect(result.guestToken).toBe('guest-token');
    expect(result.view.totalCents).toBe(170_000);
  });

  it('sums quantity into an existing item', async () => {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.cart.findUnique.mockResolvedValue(makeCart());
    mock.cartItem.findUnique.mockResolvedValue(makeItem({ quantity: 2 }));
    mock.cartItem.findMany.mockResolvedValue([
      { ...makeItem({ quantity: 3 }), product: makeProduct() },
    ]);
    await makeService(mock).addItem(GUEST, {
      productId: '00000000-0000-0000-0000-000000000001',
      quantity: 1,
    });
    expect(mock.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 3 } }),
    );
  });

  it('rejects quantities above the per-item limit', async () => {
    const mock = makePrismaMock();
    mock.product.findUnique.mockResolvedValue(makeProduct());
    mock.cart.findUnique.mockResolvedValue(makeCart());
    mock.cartItem.findUnique.mockResolvedValue(makeItem({ quantity: 99 }));
    const service = makeService(mock);
    await expect(
      service.addItem(GUEST, {
        productId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mock.cartItem.update).not.toHaveBeenCalled();
  });
});

describe('CartService view totals', () => {
  it('excludes unavailable products and applies the promo', async () => {
    const mock = makePrismaMock();
    mock.cart.findUnique.mockResolvedValue(
      makeCart({ appliedPromoCodeId: '00000000-0000-0000-0000-0000000000c1' }),
    );
    mock.cartItem.findMany.mockResolvedValue([
      { ...makeItem({ quantity: 2 }), product: makeProduct() },
      {
        ...makeItem({
          id: '00000000-0000-0000-0000-0000000000b2',
          productId: '00000000-0000-0000-0000-000000000002',
        }),
        product: makeProduct({ status: 'ARCHIVED', priceCents: 5_000 }),
      },
    ]);
    mock.promoCode.findUnique.mockResolvedValue(
      makePromo({ id: '00000000-0000-0000-0000-0000000000c1' }),
    );
    const view = await makeService(mock).getCart(GUEST);
    expect(view.subtotalCents).toBe(340_000);
    expect(view.discountCents).toBe(34_000);
    expect(view.totalCents).toBe(306_000);
    expect(view.promoCode?.code).toBe('WELCOME10');
    expect(view.items[1]?.available).toBe(false);
  });

  it('drops an expired promo from the totals', async () => {
    const mock = makePrismaMock();
    mock.cart.findUnique.mockResolvedValue(
      makeCart({ appliedPromoCodeId: '00000000-0000-0000-0000-0000000000c1' }),
    );
    mock.cartItem.findMany.mockResolvedValue([
      { ...makeItem(), product: makeProduct() },
    ]);
    mock.promoCode.findUnique.mockResolvedValue(
      makePromo({
        id: '00000000-0000-0000-0000-0000000000c1',
        endsAt: new Date(Date.now() - 60_000),
      }),
    );
    const view = await makeService(mock).getCart(GUEST);
    expect(view.promoCode).toBeNull();
    expect(view.totalCents).toBe(170_000);
  });
});

describe('CartService.mergeGuestCart', () => {
  it('moves guest items into the user cart and deletes the guest cart', async () => {
    const mock = makePrismaMock();
    // findUnique with include returns items; second call (deleteIfExists) returns null
    mock.cart.findUnique
      .mockResolvedValueOnce({
        ...makeCart({ id: '00000000-0000-0000-0000-0000000000gg' }),
        items: [makeItem({ quantity: 1 })],
      })
      .mockResolvedValueOnce(null);
    mock.cart.upsert.mockResolvedValue({
      ...makeCart({ id: '00000000-0000-0000-0000-0000000000uu', userId: 'u1' }),
      items: [makeItem({ id: 'ui1', cartId: '00000000-0000-0000-0000-0000000000uu', quantity: 3 })],
    });
    await makeService(mock).mergeGuestCart('guest-token', 'u1');
    expect(mock.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 4 } }),
    );
    expect(mock.cart.delete).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-0000000000gg' },
    });
  });

  it('creates a user cart item for a new product', async () => {
    const mock = makePrismaMock();
    mock.cart.findUnique
      .mockResolvedValueOnce({
        ...makeCart({ id: '00000000-0000-0000-0000-0000000000gg' }),
        items: [makeItem({ quantity: 1 })],
      })
      .mockResolvedValueOnce(null);
    mock.cart.upsert.mockResolvedValue({
      ...makeCart({ id: '00000000-0000-0000-0000-0000000000uu', userId: 'u1' }),
      items: [],
    });
    await makeService(mock).mergeGuestCart('guest-token', 'u1');
    expect(mock.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 1 }) }),
    );
  });

  it('is a no-op for a missing guest cart', async () => {
    const mock = makePrismaMock();
    mock.cart.findUnique.mockResolvedValue(null);
    await makeService(mock).mergeGuestCart('missing', 'u1');
    expect(mock.cart.upsert).not.toHaveBeenCalled();
    expect(mock.cart.delete).not.toHaveBeenCalled();
  });
});

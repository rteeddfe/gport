import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ProductStatus, type Cart } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { computeDiscountCents, isPromoActiveNow } from '../promo-codes/promo-codes.service.js';
import type { AddCartItemDto } from './dto/add-cart-item.dto.js';
import type { ApplyPromoDto } from './dto/apply-promo.dto.js';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import type { CartView } from './cart.view.js';

export interface CartIdentity {
  userId?: string;
  guestToken?: string;
}

export interface CartMutationResult {
  view: CartView;
  /** Set when a guest cart was created and the cookie must be sent. */
  guestToken?: string;
}

const MAX_QUANTITY_PER_ITEM = 99;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(identity: CartIdentity): Promise<CartView> {
    const cart = await this.findCart(identity);
    if (!cart) {
      return this.emptyView();
    }
    return this.buildView(cart);
  }

  async addItem(
    identity: CartIdentity,
    dto: AddCartItemDto,
  ): Promise<CartMutationResult> {
    const quantity = dto.quantity ?? 1;
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException({
        message: 'Product not found',
        errors: { productId: ['Product does not exist'] },
      });
    }
    if (product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException({
        message: 'Product is not available',
        errors: { productId: ['Product is not available for purchase'] },
      });
    }

    const { cart } = await this.getOrCreateCart(identity);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    });
    if (existingItem) {
      const nextQuantity = existingItem.quantity + quantity;
      if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException({
          message: 'Quantity limit reached',
          errors: {
            quantity: [`Max ${MAX_QUANTITY_PER_ITEM} per item`],
          },
        });
      }
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: product.id, quantity },
      });
    }
    return this.result(cart, identity);
  }

  async updateItem(
    identity: CartIdentity,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    const cart = await this.requireCart(identity);
    const item = await this.findOwnedItem(cart.id, itemId);
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.buildView(cart);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<CartView> {
    const cart = await this.requireCart(identity);
    const item = await this.findOwnedItem(cart.id, itemId);
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.buildView(cart);
  }

  async clear(identity: CartIdentity): Promise<CartView> {
    const cart = await this.findCart(identity);
    if (!cart) {
      return this.emptyView();
    }
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      this.prisma.cart.update({
        where: { id: cart.id },
        data: { appliedPromoCodeId: null },
      }),
    ]);
    return this.buildView({ ...cart, appliedPromoCodeId: null });
  }

  async applyPromo(
    identity: CartIdentity,
    dto: ApplyPromoDto,
  ): Promise<CartMutationResult> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (!promo || !isPromoActiveNow(promo)) {
      throw new BadRequestException({
        message: 'Invalid promo code',
        errors: { code: ['Promo code is invalid or expired'] },
      });
    }
    const { cart } = await this.getOrCreateCart(identity);
    const view = await this.buildView(cart);
    if (
      promo.minSubtotalCents !== null &&
      view.subtotalCents < promo.minSubtotalCents
    ) {
      throw new BadRequestException({
        message: 'Invalid promo code',
        errors: {
          code: [
            `Cart subtotal must be at least ${(promo.minSubtotalCents / 100).toFixed(2)} for this promo code`,
          ],
        },
      });
    }
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedPromoCodeId: promo.id },
    });
    return this.result({ ...cart, appliedPromoCodeId: promo.id }, identity);
  }

  async removePromo(identity: CartIdentity): Promise<CartView> {
    const cart = await this.findCart(identity);
    if (!cart) {
      return this.emptyView();
    }
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedPromoCodeId: null },
    });
    return this.buildView({ ...cart, appliedPromoCodeId: null });
  }

  /**
   * Moves guest cart items into the user's cart on login/register and drops
   * the guest cart. Idempotent: a missing or already-merged cart is a no-op.
   */
  async mergeGuestCart(guestToken: string, userId: string): Promise<void> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) {
      await this.deleteGuestCartIfExists(guestToken);
      return;
    }
    const userCart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: true },
    });
    for (const item of guestCart.items) {
      const existing = userCart.items.find((i) => i.productId === item.productId);
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(
              existing.quantity + item.quantity,
              MAX_QUANTITY_PER_ITEM,
            ),
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }
    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }

  private async findCart(identity: CartIdentity): Promise<Cart | null> {
    if (identity.userId) {
      return this.prisma.cart.findUnique({ where: { userId: identity.userId } });
    }
    if (identity.guestToken) {
      return this.prisma.cart.findUnique({
        where: { guestToken: identity.guestToken },
      });
    }
    return null;
  }

  private async requireCart(identity: CartIdentity): Promise<Cart> {
    const cart = await this.findCart(identity);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  /** Resolves or creates the cart and returns a fresh guest token when one was minted. */
  private async getOrCreateCart(
    identity: CartIdentity,
  ): Promise<{ cart: Cart; guestToken?: string }> {
    if (identity.userId) {
      const existing = await this.prisma.cart.findUnique({
        where: { userId: identity.userId },
      });
      if (existing) {
        return { cart: existing };
      }
      const cart = await this.prisma.cart.create({
        data: { userId: identity.userId },
      });
      return { cart };
    }
    if (identity.guestToken) {
      const existing = await this.prisma.cart.findUnique({
        where: { guestToken: identity.guestToken },
      });
      if (existing) {
        return { cart: existing };
      }
      const cart = await this.prisma.cart.create({
        data: { guestToken: identity.guestToken },
      });
      return { cart, guestToken: identity.guestToken };
    }
    const guestToken = randomUUID();
    const cart = await this.prisma.cart.create({
      data: { guestToken },
    });
    return { cart, guestToken };
  }

  private async findOwnedItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    return item;
  }

  private async result(
    cart: Cart,
    identity: CartIdentity,
  ): Promise<CartMutationResult> {
    // Guest carts (created or existing) echo their token so the controller
    // can (re)send the cart cookie; user carts never get one.
    const guestToken =
      identity.userId === undefined ? (cart.guestToken ?? undefined) : undefined;
    const view = await this.buildView(cart);
    return { view, ...(guestToken ? { guestToken } : {}) };
  }

  private async buildView(cart: Cart): Promise<CartView> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
    const itemViews = items.map(({ product, ...item }) => ({
      ...item,
      available: product.status === ProductStatus.PUBLISHED,
      product,
    }));
    const subtotalCents = itemViews
      .filter((item) => item.available)
      .reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

    let promoCode: CartView['promoCode'] = null;
    let discountCents = 0;
    if (cart.appliedPromoCodeId) {
      const promo = await this.prisma.promoCode.findUnique({
        where: { id: cart.appliedPromoCodeId },
      });
      if (
        promo &&
        isPromoActiveNow(promo) &&
        subtotalCents >= (promo.minSubtotalCents ?? 0)
      ) {
        discountCents = computeDiscountCents(
          promo.discountType,
          promo.value,
          subtotalCents,
        );
        promoCode = {
          id: promo.id,
          code: promo.code,
          discountType: promo.discountType,
          value: promo.value,
        };
      }
    }

    return {
      id: cart.id,
      items: itemViews,
      subtotalCents,
      discountCents,
      totalCents: Math.max(subtotalCents - discountCents, 0),
      promoCode,
    };
  }

  private emptyView(): CartView {
    return {
      id: null,
      items: [],
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      promoCode: null,
    };
  }

  private async deleteGuestCartIfExists(guestToken: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { guestToken } });
    if (cart) {
      await this.prisma.cart.delete({ where: { id: cart.id } });
    }
  }
}

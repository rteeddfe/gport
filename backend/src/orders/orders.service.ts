import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../payments/mail.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PromoCodesService } from '../promo-codes/promo-codes.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { slug: true, images: true, instruction: true } },
      keys: { select: { value: true } },
    },
  },
} satisfies Prisma.OrderInclude;

/** An unpaid GAME_KEY order holds its stock reservation until the buyer
 * completes or cancels the payment. Abandoned checkouts never send a
 * webhook, so the reservation is released lazily: the next order of the
 * same product claims every AWAITING_PAYMENT order older than this TTL
 * as CANCELLED and returns their units to stock. */
const STALE_RESERVATION_TTL_MS = 30 * 60_000;

const ADMIN_ORDER_INCLUDE = {
  ...ORDER_INCLUDE,
  user: { select: { name: true, email: true } },
} satisfies Prisma.OrderInclude;

type AdminOrderPayload = Prisma.OrderGetPayload<{
  include: typeof ADMIN_ORDER_INCLUDE;
}>;

export interface OrderItemView {
  id: string;
  productTitle: string;
  productSlug: string;
  productImage: string | null;
  instruction: string | null;
  unitPriceCents: number;
  quantity: number;
  /** Snapshot of the chosen nominal (top-up products), null for keys. */
  variantLabel: string | null;
  /** Buyer-entered top-up amount snapshot (kopecks), null for keys. */
  amountCents: number | null;
  /** Service commission snapshot charged on top of amountCents. */
  commissionCents: number | null;
  /** Account to credit (login / player ID), null for keys. */
  accountIdentifier: string | null;
  /** Auto-delivered digital keys (paid orders of key-based products). */
  keys: string[];
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  totalCents: number;
  /** Applied promo snapshot (null when the order had no promo). */
  promoCode: string | null;
  discountCents: number;
  currency: string;
  provider: string;
  createdAt: Date;
  paidAt: Date | null;
  items: OrderItemView[];
}

export interface AdminOrderView extends OrderView {
  userName: string | null;
  userEmail: string;
}

export interface PaginatedOrders {
  items: AdminOrderView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function toView(order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>): OrderView {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    promoCode: order.promoCode,
    discountCents: order.discountCents,
    currency: order.currency,
    provider: order.provider,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    items: order.items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      productSlug: item.product.slug,
      productImage: item.product.images[0] ?? null,
      instruction: item.product.instruction,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      variantLabel: item.variantLabel,
      amountCents: item.amountCents,
      commissionCents: item.commissionCents,
      accountIdentifier: item.accountIdentifier,
      keys: item.keys.map((key) => key.value),
    })),
  };
}

function toAdminView(
  order: AdminOrderPayload,
  options: { includeKeys: boolean },
): AdminOrderView {
  const view = toView(order);
  return {
    ...view,
    userName: order.user?.name ?? null,
    // Guest checkouts may have no account (registered-email guard) —
    // the email snapshot on the order is the buyer contact.
    userEmail: order.email ?? order.user?.email ?? '—',
    items: view.items.map((item) => ({
      ...item,
      // Delivered key values are secret material — SUPER_ADMIN only.
      keys: options.includeKeys ? item.keys : [],
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly mail: MailService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  /** Direct checkout, works for signed-in users AND guests (email-only:
   * a passwordless account is found-or-created to hold the purchases —
   * registering with that email later claims it). Snapshot the price,
   * open a payment session, queue the invoice letter. Key stock is
   * validated here and decremented on payment (an abandoned session must
   * not eat the stock); top-ups (nominals / amount ranges) credit an
   * account the buyer names, so they are unlimited and snapshot the
   * account identifier into the order item. */
  async create(
    userId: string | null,
    dto: CreateOrderDto,
  ): Promise<OrderView & { redirectUrl: string }> {
    let email: string;
    let ownerId = userId;
    if (ownerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, email: true },
      });
      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }
      email = dto.email ?? user.email;
    } else {
      if (!dto.email) {
        throw new BadRequestException(
          'Укажите email — на него придут ключи, а покупки привяжутся к адресу',
        );
      }
      email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true },
      });
      if (existing && existing.passwordHash === null) {
        // Passwordless holder account: the purchase lands here and follows
        // the email when the buyer registers with a password.
        ownerId = existing.id;
      } else if (!existing) {
        ownerId = (
          await this.prisma.user.create({
            data: { email, passwordHash: null },
            select: { id: true },
          })
        ).id;
      } else {
        // The email belongs to a REGISTERED account: never attach a guest
        // order to someone else's profile — deliver by letter only.
        ownerId = null;
      }
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Товар не найден или не опубликован');
    }

    // Kind-specific checkout: keys sell by quantity, top-ups sell a
    // nominal or a buyer-entered amount credited to a named account.
    let unitPriceCents = product.priceCents;
    let quantity = dto.quantity;
    let variantLabel: string | null = null;
    let amountCents: number | null = null;
    let commissionCents: number | null = null;
    if (product.kind === 'TOPUP_NOMINAL') {
      const variant = dto.variantId
        ? product.variants.find((item) => item.id === dto.variantId)
        : undefined;
      if (!variant) {
        throw new BadRequestException('Выберите номинал');
      }
      if (!dto.accountIdentifier?.trim()) {
        throw new BadRequestException(
          `Укажите ${product.accountFieldLabel?.toLowerCase() ?? 'аккаунт для зачисления'}`,
        );
      }
      unitPriceCents = variant.priceCents;
      variantLabel = variant.label;
      quantity = 1;
    } else if (product.kind === 'TOPUP_AMOUNT') {
      if (!dto.amountCents || dto.amountCents <= 0) {
        throw new BadRequestException('Укажите сумму пополнения');
      }
      if (
        product.minValue == null ||
        product.maxValue == null ||
        dto.amountCents < product.minValue ||
        dto.amountCents > product.maxValue
      ) {
        throw new BadRequestException(
          'Сумма вне допустимого диапазона пополнения',
        );
      }
      if (!dto.accountIdentifier?.trim()) {
        throw new BadRequestException(
          `Укажите ${product.accountFieldLabel?.toLowerCase() ?? 'аккаунт для зачисления'}`,
        );
      }
      // The service commission is charged on top of the credited amount
      // (percent is a product property, 0 = no fee) and snapshot here so
      // the receipt can show both lines later.
      // The service commission is charged on top of the credited amount
      // (percent is a product property, 0 = no fee) and snapshot here so
      // the receipt can show both lines later.
      commissionCents = Math.round(
        (dto.amountCents * (product.commissionPercent ?? 0)) / 100,
      );
      unitPriceCents = dto.amountCents + commissionCents;
      amountCents = dto.amountCents;
      quantity = 1;
    }
    if (!(await this.paymentsService.isEnabled(dto.provider))) {
      throw new BadRequestException('Способ оплаты недоступен');
    }

    // Promo codes price against the full order subtotal (commission and
    // quantity included); an invalid code fails the request so the buyer
    // never pays the undiscounted price by surprise. resolveForCheckout
    // is UX validation only — the authoritative maxUses enforcement is
    // the atomic conditional consume inside the order transaction below.
    const subtotalCents = unitPriceCents * quantity;
    let discountCents = 0;
    let appliedPromo: {
      id: string;
      code: string;
      maxUses: number | null;
    } | null = null;
    if (dto.promoCode?.trim()) {
      const resolved = await this.promoCodesService.resolveForCheckout(
        dto.promoCode,
        subtotalCents,
      );
      discountCents = resolved.discountCents;
      appliedPromo = {
        id: resolved.promo.id,
        code: resolved.promo.code,
        maxUses: resolved.promo.maxUses,
      };
    }
    const totalCents = subtotalCents - discountCents;
    // A GAME_KEY order RESERVES stock at creation: the conditional
    // decrement (`WHERE stock >= quantity`) is one database-level
    // check+write, so two concurrent orders can never claim the same
    // unit — the loser fails cleanly instead of paying for nothing.
    // Top-ups are unbounded and need no reservation. The reservation is
    // released on the cancel webhook and lazily (next order of the same
    // product) for abandoned checkouts — see STALE_RESERVATION_TTL_MS.
    const isKeyOrder = product.kind === 'GAME_KEY';
    const order = await this.prisma.$transaction(async (tx) => {
      if (isKeyOrder) {
        await this.releaseStaleReservations(tx, product.id);
        const reserved = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count === 0) {
          throw new BadRequestException('Недостаточно товара в наличии');
        }
      }
      if (appliedPromo) {
        // Authoritative promo consume: check (usedCount < maxUses) and
        // increment are ONE statement — the ReadCommitted row lock makes
        // two concurrent orders serialize, the loser sees count 0 and the
        // whole transaction rolls back (no order, no usage). The
        // maxUses bound comes from the validation snapshot: an admin
        // lowering it mid-request is benign (old bound applies for the
        // in-flight request); Prisma cannot compare two columns of the
        // same row in a where, so the value rides from validation.
        const consumed = await tx.promoCode.updateMany({
          where: {
            id: appliedPromo.id,
            isActive: true,
            ...(appliedPromo.maxUses === null
              ? {}
              : { usedCount: { lt: appliedPromo.maxUses } }),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (consumed.count === 0) {
          throw new BadRequestException('Промокод недействителен или истёк');
        }
      }
      return tx.order.create({
        data: {
          userId: ownerId,
          email,
          provider: dto.provider,
          totalCents,
          promoCodeId: appliedPromo?.id,
          promoCode: appliedPromo?.code ?? null,
          discountCents,
          items: {
            create: [
              {
                productId: product.id,
                productTitle: product.title,
                unitPriceCents,
                quantity,
                variantLabel,
                amountCents,
                commissionCents,
                accountIdentifier: dto.accountIdentifier?.trim() ?? null,
              },
            ],
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    const { redirectUrl } = await this.paymentsService.createPaymentSession(order);

    await this.mail.queue({
      orderId: order.id,
      to: email,
      subject: 'GPort — счёт на оплату заказа',
      body:
        `Заказ ${order.id} создан.\n\n` +
        order.items
          .map((item) => {
            const head =
              `${item.productTitle}` +
              (item.variantLabel ? ` (${item.variantLabel})` : ` × ${item.quantity}`);
            return item.accountIdentifier
              ? `${head}\nАккаунт: ${item.accountIdentifier}`
              : head;
          })
          .join('\n') +
        (discountCents > 0
          ? `\n\nПромокод ${appliedPromo?.code}: −${(discountCents / 100).toLocaleString('ru-RU')} ₽\nИтого: ${(totalCents / 100).toLocaleString('ru-RU')} ₽\n`
          : `\n\nИтого: ${(totalCents / 100).toLocaleString('ru-RU')} ₽\n`) +
        `Оплатить: ${redirectUrl}`,
    });

    return { ...toView(order), redirectUrl };
  }

  /** Frees the units held by abandoned checkouts of one product: each
   * AWAITING_PAYMENT order past the TTL is claimed as CANCELLED with a
   * per-row conditional update (the loser of a concurrent claim sees
   * count 0 and releases nothing), then its reserved units are returned
   * to stock. Runs inside the order-creation transaction. */
  private async releaseStaleReservations(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_RESERVATION_TTL_MS);
    const stale = await tx.order.findMany({
      where: {
        status: OrderStatus.AWAITING_PAYMENT,
        createdAt: { lt: staleCutoff },
        items: { some: { productId } },
      },
      select: {
        id: true,
        items: {
          select: { quantity: true, product: { select: { creditingMode: true } } },
        },
      },
    });
    for (const abandoned of stale) {
      const claimed = await tx.order.updateMany({
        where: { id: abandoned.id, status: OrderStatus.AWAITING_PAYMENT },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count === 0) {
        // A concurrent creation already claimed this reservation.
        continue;
      }
      const reservedQty = abandoned.items
        .filter((item) => item.product.creditingMode === 'AUTO_CODE')
        .reduce((sum, item) => sum + item.quantity, 0);
      if (reservedQty > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: reservedQty } },
        });
      }
    }
  }

  async findMy(userId: string): Promise<OrderView[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
      take: 50,
    });
    return orders.map(toView);
  }

  async findManyAdmin(
    query: { page?: number; limit?: number; status?: OrderStatus },
    options: { includeKeys: boolean },
  ): Promise<PaginatedOrders> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OrderWhereInput = { status: query.status };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: ADMIN_ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: orders.map((order) => toAdminView(order, options)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findDetailAdmin(
    id: string,
    options: { includeKeys: boolean },
  ): Promise<AdminOrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }
    return toAdminView(order, options);
  }
}

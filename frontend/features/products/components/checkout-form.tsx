"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck, Wallet, Zap, Hourglass } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useMe } from "@/features/auth/hooks/use-me";
import { formatPrice } from "@/lib/format";
import { createBuySchema, type BuyValues } from "@/schemas/buy.schema";
import { createOrder } from "@/services/orders.service";
import { getPaymentMethods } from "@/services/payments.service";
import type {
  AccountFieldKind,
  AuthUser,
  CreditingMode,
  ProductKind,
  ProductVariant,
} from "@/types/api";

export interface CheckoutProduct {
  id: string;
  title: string;
  priceCents: number;
  stock: number;
  kind: ProductKind;
  /** TOPUP_AMOUNT only: the buyer-entered amount range (kopecks). */
  minValue: number | null;
  maxValue: number | null;
  /** Service commission on top of the credited amount, percent 0..50. */
  commissionPercent: number;
  creditingMode: CreditingMode;
  accountFieldKind: AccountFieldKind | null;
  accountFieldLabel: string | null;
  accountFieldHint: string | null;
  /** TOPUP_NOMINAL only: the purchasable nominals, price-ordered. */
  variants: ProductVariant[];
}

/**
 * The checkout panel rendered DIRECTLY on the product page (no popup).
 * The form follows the product kind: keys sell by quantity, currency
 * packs sell a chosen nominal, wallet top-ups sell a buyer-entered
 * amount — top-ups additionally name the account to credit. Guests buy
 * with just an email — a passwordless account holds the purchase until
 * they register.
 */
export function CheckoutForm({ product }: { product: CheckoutProduct }) {
  const { data: user } = useMe();
  return (
    <CheckoutPanel
      product={product}
      user={user ?? null}
    />
  );
}

function CheckoutPanel({
  product,
  user,
}: {
  product: CheckoutProduct;
  user: AuthUser | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [amountRub, setAmountRub] = useState("");
  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPaymentMethods,
  });
  const methods = methodsQuery.data ?? [];
  const isKey = product.kind === "GAME_KEY";
  const isNominal = product.kind === "TOPUP_NOMINAL";
  const isAmount = product.kind === "TOPUP_AMOUNT";
  const accountLabel =
    product.accountFieldLabel ?? "Аккаунт для зачисления";
  const range =
    product.minValue != null && product.maxValue != null
      ? { min: product.minValue, max: product.maxValue }
      : undefined;
  const inStock = isKey ? product.stock > 0 : true;

  // The resolver embeds a Zod schema — rebuilding it on every keystroke
  // render would be the hottest waste in the panel, so memoize it on the
  // only inputs that can change it.
  const resolver = useMemo(
    () => zodResolver(createBuySchema(product.kind, accountLabel, range)),
    [product.kind, accountLabel, range],
  );

  const form = useForm<BuyValues>({
    resolver,
    defaultValues: {
      quantity: 1,
      email: user?.email ?? "",
      provider: "",
      variantId: isNominal ? (product.variants[0]?.id ?? "") : undefined,
      amountCents: isAmount ? 0 : undefined,
      accountIdentifier: "",
    },
  });
  // The page renders while /auth/me is still resolving — fill the account
  // email in once it arrives (and the field was left empty).
  useEffect(() => {
    if (user?.email && !form.getValues("email")) {
      form.setValue("email", user.email);
    }
  }, [user, form]);
  const quantity = form.watch("quantity");
  const selectedVariantId = form.watch("variantId");
  const errors = form.formState.errors;
  const selectedVariant = product.variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const amountCents = parseRub(amountRub);
  const commissionCents = isAmount
    ? Math.round((amountCents * (product.commissionPercent ?? 0)) / 100)
    : 0;
  const total = isNominal
    ? (selectedVariant?.priceCents ?? 0)
    : isAmount
      ? amountCents + commissionCents
      : product.priceCents * (Number.isFinite(quantity) ? quantity : 1);

  async function submit(values: BuyValues) {
    setIsPaying(true);
    setServerError(null);
    try {
      const result = await createOrder({
        productId: product.id,
        quantity: values.quantity,
        provider: values.provider,
        email: values.email,
        variantId: isNominal ? values.variantId : undefined,
        amountCents: isAmount ? values.amountCents : undefined,
        accountIdentifier: isKey ? undefined : values.accountIdentifier?.trim(),
      });
      // Leave for the acquirer (the emulator page in the test mode).
      window.location.href = result.redirectUrl;
    } catch (cause) {
      setServerError(
        cause instanceof Error ? cause.message : "Не удалось создать заказ",
      );
      setIsPaying(false);
    }
  }

  return (
    <aside className="border-border bg-surface/90 rounded-3xl border p-5 backdrop-blur sm:p-6 lg:sticky lg:top-24">
      <p className="text-muted-foreground text-xs font-medium">
        Оформление покупки
      </p>
      <p className="text-gradient mt-1 text-3xl font-bold tabular-nums">
        {isAmount
          ? formatPrice(amountCents)
          : isNominal
            ? formatPrice(selectedVariant?.priceCents ?? 0)
            : formatPrice(product.priceCents)}
      </p>
      <p
        className={
          inStock
            ? "text-neon mt-1 text-xs font-medium"
            : "text-destructive mt-1 text-xs font-medium"
        }
      >
        {isKey
          ? inStock
            ? `В наличии: ${product.stock} шт.`
            : "Нет в наличии"
          : "Доступно к заказу"}
      </p>

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="mt-5 space-y-5"
      >
        {isKey ? (
          <div className="space-y-1.5">
            <Label htmlFor="buy-quantity">Количество</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                aria-label="Уменьшить количество"
                disabled={!inStock || quantity <= 1}
                onClick={() =>
                  form.setValue("quantity", Math.max(1, Number(quantity) - 1))
                }
              >
                −
              </Button>
              <Input
                id="buy-quantity"
                type="number"
                min={1}
                max={Math.min(10, product.stock)}
                className="w-20 text-center"
                {...form.register("quantity", { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                aria-label="Увеличить количество"
                disabled={!inStock || quantity >= Math.min(10, product.stock)}
                onClick={() =>
                  form.setValue(
                    "quantity",
                    Math.min(Math.min(10, product.stock), Number(quantity) + 1),
                  )
                }
              >
                +
              </Button>
            </div>
            {errors.quantity ? (
              <p className="text-destructive text-xs">
                {errors.quantity.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {isNominal && product.variants.length > 0 ? (
          <div className="space-y-1.5">
            <Label>Номинал</Label>
            <Controller
              control={form.control}
              name="variantId"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-2"
                >
                  {product.variants.map((variant) => (
                    <Label
                      key={variant.id}
                      htmlFor={`variant-${variant.id}`}
                      className={cn(
                        "border-border hover:border-brand/50 flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-sm font-normal transition-colors",
                        field.value === variant.id && "border-brand/60 bg-brand/5",
                      )}
                    >
                      <RadioGroupItem
                        value={variant.id}
                        id={`variant-${variant.id}`}
                        className="sr-only"
                      />
                      <span className="font-medium">{variant.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatPrice(variant.priceCents)}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.variantId ? (
              <p className="text-destructive text-xs">
                {errors.variantId.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {isAmount ? (
          <div className="space-y-1.5">
            <Label htmlFor="buy-amount">Сумма пополнения, ₽</Label>
            <Input
              id="buy-amount"
              inputMode="decimal"
              placeholder={
                range ? `${range.min / 100}–${range.max / 100}` : "500"
              }
              value={amountRub}
              onChange={(event) => {
                setAmountRub(event.target.value);
                form.setValue("amountCents", parseRub(event.target.value), {
                  shouldValidate: true,
                });
              }}
            />
            {range ? (
              <p className="text-muted-foreground text-xs">
                От {(range.min / 100).toLocaleString("ru-RU")} до{" "}
                {(range.max / 100).toLocaleString("ru-RU")} ₽.
              </p>
            ) : null}
            {errors.amountCents ? (
              <p className="text-destructive text-xs">
                {errors.amountCents.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {!isKey ? (
          <div className="space-y-1.5">
            <Label htmlFor="buy-account">{accountLabel}</Label>
            <Input
              id="buy-account"
              type={product.accountFieldKind === "EMAIL" ? "email" : "text"}
              placeholder={
                product.accountFieldKind === "EMAIL"
                  ? "you@mail.ru"
                  : product.accountFieldKind === "ID"
                    ? "1234567890"
                    : "account_login"
              }
              {...form.register("accountIdentifier")}
            />
            {product.accountFieldHint ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {product.accountFieldHint}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Проверьте внимательно: при ошибке зачисление уйдёт на чужой
                аккаунт.
              </p>
            )}
            {errors.accountIdentifier ? (
              <p className="text-destructive text-xs">
                {errors.accountIdentifier.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="buy-email">Email для чека и ключей</Label>
          <Input
            id="buy-email"
            type="email"
            placeholder="you@mail.ru"
            {...form.register("email")}
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Аккаунт не обязателен: чек и коды придут на этот адрес, а покупки
            сохранятся — если позже зарегистрируетесь с той же почтой, они
            появятся в кабинете.
          </p>
          {errors.email ? (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Способ оплаты</Label>
          {methodsQuery.isPending ? (
            <p className="text-muted-foreground text-xs">Загружаем…</p>
          ) : methods.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Способы оплаты ещё не настроены.
            </p>
          ) : (
            <Controller
              control={form.control}
              name="provider"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="gap-2"
                >
                  {methods.map((method) => (
                    <Label
                      key={method.id}
                      htmlFor={`provider-${method.id}`}
                      className="border-border hover:border-brand/50 flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-normal"
                    >
                      <RadioGroupItem
                        value={method.id}
                        id={`provider-${method.id}`}
                      />
                      <span className="font-medium">{method.name}</span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
          )}
          {errors.provider ? (
            <p className="text-destructive text-xs">
              {errors.provider.message}
            </p>
          ) : null}
        </div>

        <div className="border-border flex items-center justify-between border-t pt-4">
          <span className="text-sm font-medium">К оплате</span>
          <span className="text-gradient text-lg font-bold tabular-nums">
            {formatPrice(total)}
          </span>
        </div>
        {commissionCents > 0 ? (
          <p className="text-muted-foreground -mt-2 text-xs">
            Включая комиссию сервиса {formatPrice(commissionCents)}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={!inStock || isPaying || methods.length === 0}
          className="w-full gap-2"
        >
          {isPaying ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          Перейти к оплате
        </Button>
        {product.creditingMode === "MANUAL" ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Hourglass className="size-3.5" aria-hidden />
            После оплаты заказ передаётся оператору — зачисление в течение
            рабочего дня.
          </p>
        ) : (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Zap className="size-3.5" aria-hidden />
            Моментальная выдача после оплаты.
          </p>
        )}
        {serverError ? (
          <p className="text-destructive text-xs">{serverError}</p>
        ) : null}
      </form>
    </aside>
  );
}

/** «1 299,50» / «1299.99» → kopecks; unparsable input → 0 (fails validation). */
function parseRub(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

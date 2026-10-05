"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { createBuySchema, type BuyValues } from "@/schemas/buy.schema";
import { createOrder } from "@/services/orders.service";
import { getPaymentMethods } from "@/services/payments.service";
import type { HomeServiceCard } from "@/types/api";

import { TopupLegalLine } from "./topup-legal-line";

const BULLET_POINTS = [
  "Оплата картами российских банков",
  "Зачисление после подтверждения оплаты",
  "Поддержка 24/7 — ответим в течение минуты",
];

/** «1234,5 » / «1 234» → kopecks; a comma is accepted as the separator. */
function parseRub(value: string): number {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/**
 * Home top-up block (section 2): a REAL checkout for the admin-picked
 * top-up services (HomeContent.topupServices). Manual crediting by the
 * account name — the same POST /orders flow as the product page, so the
 * acquirer redirect, price snapshot and letters all apply. The service
 * commission (a product property) is added on top of the entered amount.
 * Renders nothing until services are configured in the home settings.
 */
export function TopupBanner({ services }: { services?: HomeServiceCard[] }) {
  if (!services || services.length === 0) {
    return null;
  }
  return <TopupForm services={services} />;
}

function TopupForm({ services }: { services: HomeServiceCard[] }) {
  const [selectedId, setSelectedId] = useState(services[0]?.productId ?? "");
  const service =
    services.find((item) => item.productId === selectedId) ?? services[0]!;

  const accountLabel = service.accountFieldLabel ?? "Аккаунт для зачисления";
  const range = {
    min: service.priceFromCents,
    max: service.maxValue ?? Math.max(service.priceFromCents, 2_000_000),
  };
  const resolver = useMemo(
    () => zodResolver(createBuySchema("TOPUP_AMOUNT", accountLabel, range)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the schema
    // follows the selected service; reset below keeps the form in sync.
    [service.productId],
  );

  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPaymentMethods,
  });
  const methods = methodsQuery.data ?? [];

  const [serverError, setServerError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [amountRub, setAmountRub] = useState("");

  const form = useForm<BuyValues>({
    resolver,
    defaultValues: {
      quantity: 1,
      email: "",
      provider: "",
      amountCents: 0,
      accountIdentifier: "",
    },
  });
  const errors = form.formState.errors;
  const amountCents = parseRub(amountRub);
  const commissionCents = Math.round(
    (amountCents * (service.commissionPercent ?? 0)) / 100,
  );
  const total = amountCents + commissionCents;

  function switchService(productId: string) {
    setSelectedId(productId);
    setAmountRub("");
    setServerError(null);
    form.reset({
      quantity: 1,
      email: form.getValues("email"),
      provider: form.getValues("provider"),
      amountCents: 0,
      accountIdentifier: "",
    });
  }

  async function submit(values: BuyValues) {
    setIsPaying(true);
    setServerError(null);
    try {
      const order = await createOrder({
        productId: service.productId,
        quantity: 1,
        amountCents: values.amountCents ?? 0,
        accountIdentifier: values.accountIdentifier ?? "",
        email: values.email,
        provider: values.provider,
      });
      window.location.assign(order.redirectUrl);
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : "Ошибка");
      setIsPaying(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(139_92_246/0.16),transparent_40%),radial-gradient(46rem_20rem_at_82%_18%,rgb(85_221_229/0.12),transparent_65%)]"
      />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-center">
        <div className="border-border/80 bg-surface/80 rounded-2xl border p-5 backdrop-blur sm:p-6">
          <div className="flex items-center gap-3">
            <span className="border-border bg-canvas grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border">
              <ServiceMarkCard service={service} className="size-6" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs">Пополнение</p>
              <h3 className="text-base leading-tight font-bold">{service.title}</h3>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="mt-4 grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="topup-account">{accountLabel}</Label>
                <Input
                  id="topup-account"
                  type={service.accountFieldKind === "EMAIL" ? "email" : "text"}
                  placeholder={
                    service.accountFieldKind === "EMAIL"
                      ? "mail@example.com"
                      : service.accountFieldKind === "ID"
                        ? "123456789"
                        : "имя аккаунта"
                  }
                  {...form.register("accountIdentifier")}
                />
                {errors.accountIdentifier ? (
                  <p className="text-destructive text-xs">
                    {errors.accountIdentifier.message}
                  </p>
                ) : null}
                {service.accountFieldHint ? (
                  <p className="text-muted-foreground text-xs">{service.accountFieldHint}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="topup-amount">Сумма, ₽</Label>
                  <Input
                    id="topup-amount"
                    inputMode="decimal"
                    placeholder={`от ${(range.min / 100).toLocaleString("ru-RU")}`}
                    value={amountRub}
                    onChange={(event) => {
                      setAmountRub(event.target.value);
                      form.setValue("amountCents", parseRub(event.target.value), {
                        shouldValidate: form.formState.isSubmitted,
                      });
                    }}
                  />
                  {errors.amountCents ? (
                    <p className="text-destructive text-xs">{errors.amountCents.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topup-email">Email для чека</Label>
                  <Input
                    id="topup-email"
                    type="email"
                    placeholder="mail@example.com"
                    {...form.register("email")}
                  />
                  {errors.email ? (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Способ оплаты</Label>
                <Controller
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-wrap gap-2"
                    >
                      {methods.map((method) => (
                        <Label
                          key={method.id}
                          className={cn(
                            "border-border bg-canvas/60 hover:border-brand/50 flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                            field.value === method.id && "border-brand/60 bg-brand/5",
                          )}
                        >
                          <RadioGroupItem value={method.id} className="sr-only" />
                          {method.name}
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
                {errors.provider ? (
                  <p className="text-destructive text-xs">{errors.provider.message}</p>
                ) : null}
              </div>

              {commissionCents > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Сумма {amountCents.toLocaleString("ru-RU")} ₽ + комиссия{" "}
                  {commissionCents.toLocaleString("ru-RU")} ₽
                </p>
              ) : null}
              <Button type="submit" size="lg" className="h-12 w-full text-sm font-semibold" disabled={isPaying}>
                {isPaying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Оплатить {total.toLocaleString("ru-RU")} ₽
              </Button>
              {serverError ? (
                <p className="text-destructive text-xs">{serverError}</p>
              ) : null}
            </form>
          </Form>

          <TopupLegalLine className="mt-4" />
        </div>

        <div>
          <div className="flex items-center gap-4">
            <span className="border-border bg-canvas grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl border">
              <ServiceMarkCard service={service} className="size-11" />
            </span>
            <div>
              <h3 className="text-2xl font-bold">Пополнение {service.title}</h3>
              <p className="text-neon mt-1 text-sm font-medium">
                от {(service.priceFromCents / 100).toLocaleString("ru-RU")} ₽
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 text-sm">
            {BULLET_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2.5">
                <span className="bg-brand/15 text-brand-bright grid size-6 shrink-0 place-items-center rounded-full">
                  <Check className="size-3.5" aria-hidden />
                </span>
                <span className="text-foreground/85">{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <p className="text-muted-foreground text-xs font-medium">Другие сервисы</p>
            {/* All configured services stay in the row (the active one is
                highlighted), so switching never reshuffles the tiles. */}
            <div role="group" aria-label="Сервис пополнения" className="mt-2 flex flex-wrap gap-2">
              {services.map((item) => {
                const active = item.productId === service.productId;
                return (
                  <button
                    key={item.productId}
                    type="button"
                    title={item.title}
                    aria-pressed={active}
                    onClick={() => switchService(item.productId)}
                    className={cn(
                      "grid size-11 place-items-center overflow-hidden rounded-xl border transition-all",
                      active
                        ? "border-brand bg-brand/10"
                        : "border-border bg-canvas/60 hover:border-brand/50",
                    )}
                  >
                    <ServiceMarkCard service={item} className="size-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mini logo: the admin upload wins, then the product cover, then the
 * initial letter. Uploads may be SVG — plain img on purpose. */
function ServiceMarkCard({
  service,
  className,
}: {
  service: HomeServiceCard;
  className?: string;
}) {
  const art = service.iconUrl ?? service.image;
  if (art) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={art} alt="" className={cn("object-contain", className)} />;
  }
  return (
    <span
      className={cn(
        "grid place-items-center font-bold text-white",
        className,
      )}
      aria-hidden
    >
      {service.title.slice(0, 1)}
    </span>
  );
}

"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useTopupWidget } from "@/features/topup/hooks/use-topup-widget";
import { cn } from "@/lib/utils";

import { AmountField, CountryField, LoginField } from "./fields";
import { PaymentPendingHint } from "./payment-pending-hint";
import { ServiceMark } from "./service-mark";
import { TopupLegalLine } from "./topup-legal-line";
import { TOPUP_SERVICES } from "../widget-data";

const BULLET_POINTS = [
  "Моментальное зачисление на аккаунт",
  "Оплата картами российских банков",
  "Поддержка 24/7 — ответим в течение минуты",
];

/**
 * Top-up block on the homepage: a gradient banner with a glass form card
 * on the left and the service showcase (big mark, bullets, other services)
 * on the right. Functional shell of the igromir.yandex.ru constructor in
 * our style — payments are not approved, so a valid submit shows the
 * "coming later" hint instead of a request.
 */
export function TopupBanner() {
  const {
    form,
    service,
    selectService,
    currency,
    setCountryDisplay,
    setAmountDisplay,
    total,
    payHint,
    submit,
  } = useTopupWidget();

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
              <ServiceMark service={service} className="size-6" scale={0.34} />
            </span>
            <div>
              <p className="text-muted-foreground text-xs">Пополнение</p>
              <h3 className="text-base leading-tight font-bold">{service.name}</h3>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={submit} noValidate className="mt-4 grid gap-3">
              <LoginField service={service} />
              <div className="grid grid-cols-2 gap-3">
                <CountryField onValueChange={setCountryDisplay} />
                <AmountField withHint={false} currency={currency} onValueChange={setAmountDisplay} />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full text-sm font-semibold">
                Оплатить {total.toLocaleString("ru-RU")} {currency}
              </Button>
            </form>
          </Form>

          {payHint ? <PaymentPendingHint className="mt-3" /> : null}
          <TopupLegalLine className="mt-4" />
        </div>

        <div>
          <div className="flex items-center gap-4">
            <span className="border-border bg-canvas grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl border">
              <ServiceMark service={service} className="size-11" scale={0.55} />
            </span>
            <div>
              <h3 className="text-2xl font-bold">Пополнение {service.name}</h3>
              <p className="text-neon mt-1 text-sm font-medium">
                от {service.priceFrom.toLocaleString("ru-RU")} ₽
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
            {/* All services stay in the row (the active one is highlighted),
                so switching never reshuffles the neighbouring tiles. */}
            <div role="group" aria-label="Сервис пополнения" className="mt-2 flex flex-wrap gap-2">
              {TOPUP_SERVICES.map((item) => {
                const active = item.name === service.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    title={item.name}
                    aria-pressed={active}
                    onClick={() => selectService(item.name)}
                    className={cn(
                      "grid size-11 place-items-center overflow-hidden rounded-xl border transition-all",
                      active
                        ? "border-brand bg-brand/10"
                        : "border-border bg-canvas/60 hover:border-brand/50",
                    )}
                  >
                    <ServiceMark service={item} className="size-5" scale={0.3} />
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

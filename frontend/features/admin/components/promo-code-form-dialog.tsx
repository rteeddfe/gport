"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api/errors";
import { toCents } from "@/lib/money";
import {
  promoCodeSchema,
  type PromoCodeFormValues,
} from "@/schemas/promo-code.schema";
import { useAdminPromoCodeMutations } from "../hooks/use-admin-promo-codes";
import type { PromoCode } from "@/types/api";

const EMPTY_VALUES: PromoCodeFormValues = {
  code: "",
  discountType: "PERCENT",
  value: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  maxUses: "",
  minSubtotalRub: "",
};

/** ISO string → the local format <input type="datetime-local"> expects. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formValuesFrom(promo: PromoCode): PromoCodeFormValues {
  return {
    code: promo.code,
    discountType: promo.discountType,
    value:
      promo.discountType === "PERCENT"
        ? String(promo.value)
        : (promo.value / 100).toString(),
    isActive: promo.isActive,
    startsAt: toDatetimeLocal(promo.startsAt),
    endsAt: toDatetimeLocal(promo.endsAt),
    maxUses: promo.maxUses === null ? "" : String(promo.maxUses),
    minSubtotalRub:
      promo.minSubtotalCents === null
        ? ""
        : (promo.minSubtotalCents / 100).toString(),
  };
}

/** Create/edit dialog for a promo code. Empty optional fields are sent as
 * null — the backend clears them; ruble strings become kopecks. */
export function PromoCodeFormDialog({
  promo,
  open,
  onOpenChange,
}: {
  promo: PromoCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useAdminPromoCodeMutations();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: promo ? formValuesFrom(promo) : EMPTY_VALUES,
  });
  const isSubmitting = form.formState.isSubmitting;
  const discountType = form.watch("discountType");

  async function onSubmit(values: PromoCodeFormValues) {
    setError(null);
    const input = {
      code: values.code,
      discountType: values.discountType,
      value:
        values.discountType === "PERCENT"
          ? Number(values.value)
          : toCents(values.value),
      isActive: values.isActive,
      startsAt: values.startsAt
        ? new Date(values.startsAt).toISOString()
        : null,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
      maxUses: values.maxUses ? Number(values.maxUses) : null,
      minSubtotalCents: values.minSubtotalRub
        ? toCents(values.minSubtotalRub)
        : null,
    };
    try {
      if (promo) {
        await update.mutateAsync({ id: promo.id, input });
      } else {
        await create.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(promo ? formValuesFrom(promo) : EMPTY_VALUES);
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {promo ? "Редактировать промокод" : "Новый промокод"}
          </DialogTitle>
          <DialogDescription>
            Скидка применяется к корзине по коду; правила проверяет сервер.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">Код</Label>
            <Input
              id="promo-code"
              placeholder="GPORT10"
              className="font-mono uppercase"
              {...form.register("code")}
            />
            <p className="text-muted-foreground text-xs">
              A–Z, 0–9, «_» и «-»; ввод не зависит от регистра.
            </p>
            {form.formState.errors.code ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.code.message}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Тип скидки</Label>
              <Select
                value={discountType}
                onValueChange={(next) =>
                  form.setValue("discountType", next as "PERCENT" | "FIXED")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Процент, %</SelectItem>
                  <SelectItem value="FIXED">Фикс. сумма, ₽</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-value">
                {discountType === "PERCENT" ? "Скидка, %" : "Скидка, ₽"}
              </Label>
              <Input
                id="promo-value"
                inputMode="decimal"
                placeholder={discountType === "PERCENT" ? "10" : "500"}
                {...form.register("value")}
              />
              {form.formState.errors.value ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.value.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="promo-starts">Начало</Label>
              <Input id="promo-starts" type="datetime-local" {...form.register("startsAt")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-ends">Окончание</Label>
              <Input id="promo-ends" type="datetime-local" {...form.register("endsAt")} />
              {form.formState.errors.endsAt ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.endsAt.message}
                </p>
              ) : null}
            </div>
            <p className="text-muted-foreground col-span-2 text-xs">
              Пусто — без ограничения по времени.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="promo-max-uses">Лимит использований</Label>
              <Input
                id="promo-max-uses"
                inputMode="numeric"
                placeholder="500"
                {...form.register("maxUses")}
              />
              {form.formState.errors.maxUses ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.maxUses.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-min-subtotal">Мин. сумма заказа, ₽</Label>
              <Input
                id="promo-min-subtotal"
                inputMode="decimal"
                placeholder="1500"
                {...form.register("minSubtotalRub")}
              />
              {form.formState.errors.minSubtotalRub ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.minSubtotalRub.message}
                </p>
              ) : null}
            </div>
            <p className="text-muted-foreground col-span-2 text-xs">
              Пусто — без лимита и без условия по сумме.
            </p>
          </div>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked === true)}
            />
            Активен
          </Label>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Сохранить
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

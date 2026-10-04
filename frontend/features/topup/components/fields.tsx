"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TopupValues } from "@/schemas/topup.schema";

import { TOPUP_COUNTRIES, type TopupService } from "../widget-data";
import { HintIcon } from "./hint-icon";

/** Pre-wired top-up fields shared by every widget layout. Place them
 * inside <Form> (FormProvider) and size via the FormItem className. */

export function LoginField({
  service,
  className,
  withHint = true,
}: {
  service: TopupService;
  className?: string;
  withHint?: boolean;
}) {
  const { control } = useFormContext<TopupValues>();
  return (
    <FormField
      control={control}
      name="login"
      render={({ field }) => (
        <FormItem className={className}>
          <FormControl>
            <div className="relative">
              <Input
                placeholder={service.loginLabel}
                autoComplete="off"
                className={cn(withHint && "pr-9")}
                {...field}
              />
              {withHint ? (
                <span className="absolute top-1/2 right-3 -translate-y-1/2">
                  <HintIcon text={`Куда зачислить средства: ${service.loginLabel.toLowerCase()}`} />
                </span>
              ) : null}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CountryField({
  className,
  onValueChange,
}: {
  className?: string;
  /** Mirrors the selected country out to the layout's currency sign. */
  onValueChange?: (value: TopupValues["country"]) => void;
}) {
  const { control } = useFormContext<TopupValues>();
  return (
    <FormField
      control={control}
      name="country"
      render={({ field }) => (
        <FormItem className={className}>
          <FormControl>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onValueChange?.(value as TopupValues["country"]);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Страна">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPUP_COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AmountField({
  className,
  currency = "₽",
  withHint = true,
  onValueChange,
}: {
  className?: string;
  /** Currency sign shown after the amount (follows the selected country). */
  currency?: string;
  withHint?: boolean;
  /** Mirrors the typed amount out to the layout's live total. */
  onValueChange?: (value: string) => void;
}) {
  const { control } = useFormContext<TopupValues>();
  return (
    <FormField
      control={control}
      name="amount"
      render={({ field }) => (
        <FormItem className={className}>
          <FormControl>
            <div className="relative">
              <Input
                inputMode="numeric"
                placeholder="500"
                autoComplete="off"
                className={cn("pr-9", withHint && "pr-16")}
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  onValueChange?.(event.target.value);
                }}
              />
              {/* Sign sits on the right so it never overlaps the typed
                  number; the hint icon lines up next to it. */}
              <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
                <span className="text-muted-foreground pointer-events-none text-sm font-medium">
                  {currency}
                </span>
                {withHint ? (
                  <HintIcon text="Сумма зачисления. Итог к оплате = сумма + комиссия 6%" />
                ) : null}
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PromoField({ className }: { className?: string }) {
  const { control } = useFormContext<TopupValues>();
  return (
    <FormField
      control={control}
      name="promo"
      render={({ field }) => (
        <FormItem className={className}>
          <FormControl>
            <Input placeholder="Промокод" autoComplete="off" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

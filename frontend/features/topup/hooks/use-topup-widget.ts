import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { topupSchema, type TopupValues } from "@/schemas/topup.schema";

import { COUNTRY_CURRENCIES, getTopupService, TOPUP_FEE_RATE, TOPUP_SERVICES } from "../widget-data";

/** Shared state of every top-up widget layout: the selected service, the
 * RHF + Zod form and a mirrored amount string for the live total
 * (form.watch would bail the React Compiler). Payments are not approved —
 * a valid submit only reveals the "coming later" hint. */
export function useTopupWidget() {
  const [serviceName, setServiceName] = useState(TOPUP_SERVICES[0]!.name);
  const [payHint, setPayHint] = useState(false);
  const service = getTopupService(serviceName);

  const form = useForm<TopupValues>({
    resolver: zodResolver(topupSchema),
    defaultValues: { login: "", country: "Россия", amount: "500", promo: "" },
  });
  // Mirrors the amount field for the live total — see form.watch note above.
  const [amountDisplay, setAmountDisplay] = useState("500");
  const total = Math.ceil((Number(amountDisplay) || 0) * (1 + TOPUP_FEE_RATE));
  // Mirrors the country for the currency sign, same reason as amountDisplay.
  const [countryDisplay, setCountryDisplay] = useState<TopupValues["country"]>("Россия");
  const currency = COUNTRY_CURRENCIES[countryDisplay];

  const selectService = (name: string) => {
    setServiceName(name);
    setPayHint(false);
  };

  const submit = form.handleSubmit(() => setPayHint(true));

  return {
    form,
    service,
    selectService,
    currency,
    setCountryDisplay,
    amountDisplay,
    setAmountDisplay,
    total,
    payHint,
    submit,
  };
}

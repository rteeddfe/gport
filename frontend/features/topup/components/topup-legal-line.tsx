import Link from "next/link";

import { cn } from "@/lib/utils";

export function TopupLegalLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-xs leading-relaxed", className)}>
      Нажимая «Оплатить», вы принимаете{" "}
      <Link href="/policies/offer" className="underline transition-colors hover:text-foreground">
        оферту
      </Link>{" "}
      и{" "}
      <Link href="/policies/offer" className="underline transition-colors hover:text-foreground">
        условия использования
      </Link>{" "}
      магазина GPort.
    </p>
  );
}

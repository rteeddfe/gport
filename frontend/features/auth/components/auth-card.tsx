import Image from "next/image";
import type { ReactNode } from "react";

import { getSettings } from "@/services/settings.service";

/**
 * Shared shell for the auth screens: gradient hairline border (violet ->
 * cyan) over a surface card, the settings-driven logo (nothing rendered
 * while no logo is configured — it fills from the admin), title and the
 * switch link.
 */
export async function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const settings = await getSettings().catch(() => null);
  const logoUrl = settings?.logoUrl ?? "";
  const siteName = settings?.siteName ?? "";

  return (
    <div className="neon-border rounded-2xl p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={siteName}
            width={2400}
            height={1569}
            priority
            unoptimized={logoUrl.toLowerCase().endsWith(".svg")}
            className="h-8 w-auto"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>
      </div>
      {children}
      {footer ? (
        <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
      ) : null}
    </div>
  );
}

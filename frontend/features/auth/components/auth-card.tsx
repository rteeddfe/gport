import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared shell for the auth screens: gradient hairline border (violet ->
 * cyan) over a surface card, GPort wordmark, title and the switch link.
 */
export function AuthCard({
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
  return (
    <div className="neon-border rounded-2xl p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo2.png"
          alt="GPort"
          width={2400}
          height={1569}
          priority
          className="h-8 w-auto"
        />
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

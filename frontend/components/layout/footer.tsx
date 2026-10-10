import Image from "next/image";
import Link from "next/link";

import { AppInstallLinks } from "@/features/pwa/components/app-install-links";
import { getPolicies } from "@/services/policies.service";
import { getSettings } from "@/services/settings.service";
import { Container } from "./container";

function footerLinkClass(): string {
  return "text-muted-foreground transition-colors hover:text-foreground";
}

/** Storefront footer: brand (logo, name, descriptor), the admin-built menu
 * columns (settings → «Основные настройки» → меню футера), legal pages —
 * only those that actually exist in the DB (created in the admin), social
 * circles and the support email. Anything empty does not render. */
export async function Footer() {
  const [settings, policies] = await Promise.all([
    getSettings().catch(() => null),
    getPolicies().catch(() => []),
  ]);
  const siteName = settings?.siteName ?? "";
  const logoUrl = settings?.logoUrl ?? "";
  const descriptor = settings?.descriptorFooter ?? "";
  const menus = settings?.footerMenus ?? [];
  const socials = settings?.socials ?? [];
  const supportEmail = settings?.supportEmail ?? "";
  const legal = [
    settings?.legalName,
    settings?.legalInn ? `ИНН ${settings.legalInn}` : "",
    settings?.legalOgrn ? `ОГРН(ИП) ${settings.legalOgrn}` : "",
    settings?.legalAddress,
  ].filter(Boolean);
  const legalPhone = settings?.legalPhone ?? "";

  return (
    <footer className="relative overflow-hidden border-t">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60rem_16rem_at_50%_0%,rgb(139_92_246/0.08),transparent_70%)]"
      />
      <Container className="relative py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex w-fit items-center gap-2.5">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={2400}
                  height={1569}
                  className="h-9 w-auto object-contain"
                />
              ) : null}
            </Link>
            {descriptor ? (
              <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
                {descriptor}
              </p>
            ) : null}
          </div>

          {menus.map((menu, menuIndex) => (
            <nav
              key={`${menu.title}-${menuIndex}`}
              aria-label={menu.title || `Меню ${menuIndex + 1}`}
            >
              {menu.title ? (
                <h3 className="text-sm font-semibold">{menu.title}</h3>
              ) : null}
              <ul
                className={
                  menu.title ? "mt-4 space-y-2.5 text-sm" : "space-y-2.5 text-sm"
                }
              >
                {/* Skip rows saved without a link — an empty href would
                    render an <a href=""> and warn in the console. */}
                {menu.items
                  .filter((item) => item.href)
                  .map((item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <Link href={item.href} className={footerLinkClass()}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          ))}

          {policies.length > 0 ? (
            <nav aria-label="Документы">
              <h3 className="text-sm font-semibold">Документы</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {policies.map((policy) => (
                  <li key={policy.slug}>
                    <Link
                      href={`/policies/${policy.slug}`}
                      className={footerLinkClass()}
                    >
                      {policy.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="border-border text-muted-foreground mt-10 border-t pt-6 text-xs">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            {socials.map((social) => (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                title={social.label}
                className="border-border bg-canvas/60 hover:border-brand/50 grid size-10 place-items-center rounded-full border transition-colors"
              >
                {social.iconUrl ? (
                  <Image
                    src={social.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5"
                  />
                ) : (
                  <span className="text-[11px]">{social.label.slice(0, 2)}</span>
                )}
              </a>
            ))}
            <span aria-hidden className="border-border bg-border/60 mx-1 h-6 w-px" />
            <AppInstallLinks />
          </div>
          {siteName ? (
            <p className="mt-4">
              © {new Date().getFullYear()} {siteName}. Все права защищены
            </p>
          ) : null}
          {supportEmail ? (
            <p className="mt-1">
              Поддержка:{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="transition-colors hover:text-foreground"
              >
                {supportEmail}
              </a>
            </p>
          ) : null}
          {legal.length > 0 || legalPhone ? (
            <p className="mt-3 leading-relaxed">
              {[...legal, legalPhone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}

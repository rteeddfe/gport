import Image from "next/image";
import Link from "next/link";

import { AppInstallLinks } from "@/features/pwa/components/app-install-links";
import { getSettings } from "@/services/settings.service";
import { Container } from "./container";

/** Mirrors the reference footer layout: buyer column + documents column
 * (FAQ and reviews deep-link to the homepage sections). */
const BUYER_LINKS = [
  { href: "/#faq", label: "Часто задаваемые вопросы" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/policies/refund", label: "Политика возврата средств" },
] as const;

const STORE_LINKS = [
  { href: "/policies/contacts", label: "Контакты" },
  { href: "/policies/offer", label: "Публичная оферта" },
  { href: "/policies/privacy", label: "Политика конфиденциальности" },
  { href: "/policies/rightsholders", label: "Информация для правообладателям" },
] as const;

function footerLinkClass(): string {
  return "text-muted-foreground transition-colors hover:text-foreground";
}

/** Storefront footer — brand name, socials and the support email come from
 * the admin site settings; on API failure the seeded statics render. */
export async function Footer() {
  const settings = await getSettings().catch(() => null);
  const siteName = settings?.siteName ?? "GPort";
  const logoUrl = settings?.logoUrl ?? "/logo2.png";
  const socials = settings?.socials ?? [
    { label: "Telegram", url: "https://t.me/gport", iconUrl: "/brands/telegram-muted.svg" },
    { label: "VK", url: "https://vk.com/gport", iconUrl: "/brands/vk.svg" },
  ];
  const supportEmail = settings?.supportEmail ?? "support@gport.ru";

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
              <Image
                src={logoUrl}
                alt={siteName}
                width={2400}
                height={1569}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
              Интернет-магазин цифровых игровых товаров и пополнений. Моментальная
              доставка, честные цены и поддержка 24/7.
            </p>
          </div>

          <nav aria-label="Покупателям">
            <h3 className="text-sm font-semibold">Покупателям</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {BUYER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass()}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Магазин">
            <h3 className="text-sm font-semibold">{siteName}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {STORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass()}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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
          <p className="mt-4">
            © {new Date().getFullYear()} {siteName}. Все права защищены
          </p>
          <p className="mt-1">
            Поддержка:{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="transition-colors hover:text-foreground"
            >
              {supportEmail}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/layout/container";
import { getProducts } from "@/services/products.service";
import { ProductRevealGrid } from "@/features/products/components/product-reveal-grid";
import { SERVICES } from "@/features/home/services-data";
import type { Product } from "@/types/api";

export const metadata = { title: "Пополнение" };

/**
 * Top-up screen: the six services from the home wall (same `.service-tile`
 * CSS, presentational — the purchase flow itself is not approved yet)
 * over the approved neon backdrop, plus the real game-currency products
 * from the API pointing at the catalog. Renders nothing in the products
 * grid when the API is down (the backdrop still carries the screen).
 */
export default async function TopUpPage() {
  let items: Product[] = [];
  try {
    const result = await getProducts({ categorySlug: "game-currency", limit: 12 });
    items = result.items;
  } catch {
    items = [];
  }

  return (
    <section className="relative py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(52rem 34rem at 12% -8%, rgb(139 92 246 / 0.18), transparent 62%)",
              "radial-gradient(44rem 30rem at 88% 12%, rgb(85 221 229 / 0.12), transparent 60%)",
              "radial-gradient(40rem 32rem at 50% 115%, rgb(139 92 246 / 0.14), transparent 65%)",
            ].join(", "),
          }}
        />
        <div className="animate-blob-drift absolute -top-48 left-[4%] h-[32rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.5),transparent_72%)] blur-2xl" />
        <div
          className="animate-blob-drift absolute -right-36 top-1/4 h-[30rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(85_221_229/0.38),transparent_72%)] blur-2xl"
          style={{ animationDelay: "-3.5s" }}
        />
        <div
          className="animate-blob-drift absolute -bottom-48 left-[32%] h-[32rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(167_139_250/0.42),transparent_72%)] blur-2xl"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <Container className="relative">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Пополнение сервисов
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Пополнение <span className="text-gradient">игр и сервисов</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Без регистрации и верификации, моментальная доставка после оплаты.
          </p>
        </header>

        <div className="service-wall mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((service) => (
            <div
              key={service.name}
              style={{ "--tile-glow": service.glow } as CSSProperties}
              className="service-tile relative aspect-[3/4] overflow-hidden rounded-2xl"
            >
              <span
                className="tile-art absolute inset-0 flex items-center justify-center"
                style={{ background: service.background }}
              >
                {service.icon ? (
                  <Image
                    src={service.icon}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="tile-logo size-14"
                  />
                ) : (
                  <span className="tile-logo">{service.iconNode}</span>
                )}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pt-8 pb-2.5">
                <span className="block text-xs font-semibold text-white">{service.name}</span>
                <span className="mt-0.5 block text-[11px] text-white/65">
                  от {service.priceFrom.toLocaleString("ru-RU")} ₽
                </span>
              </span>
            </div>
          ))}
        </div>

        {items.length > 0 ? (
          <>
            <div className="mt-14 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
                  Игровая валюта
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">
                  Валюта для <span className="text-gradient">любимых игр</span>
                </h2>
              </div>
              <Link
                href="/products?category=game-currency"
                className="text-neon hidden items-center gap-1.5 text-sm font-medium hover:underline sm:inline-flex"
              >
                Весь раздел
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8">
              <ProductRevealGrid
                items={items}
                columnsClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              />
            </div>
          </>
        ) : null}
      </Container>
    </section>
  );
}

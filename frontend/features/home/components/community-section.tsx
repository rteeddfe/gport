import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

/** Placeholder marketing numbers and social stats — no aggregate endpoints
 * exist yet; when a stats source is approved these move behind
 * services/*.service.ts. */
const STATS = [
  {
    badge: "Количество клиентов:",
    prefix: "Более",
    value: 136_684,
    caption: "довольных клиентов",
    wash: "bg-[radial-gradient(30rem_16rem_at_85%_10%,rgb(85_221_229/0.16),transparent_70%)]",
    square: "bg-raised/60",
  },
  {
    badge: "Количество пополнений:",
    prefix: "Свыше",
    value: 1_088_276,
    caption: "успешных пополнений",
    wash: "bg-[radial-gradient(30rem_16rem_at_85%_10%,rgb(139_92_246/0.2),transparent_70%)]",
    square: "bg-brand/10",
  },
] as const;

const SOCIALS = [
  {
    handle: "@gport",
    description: "Конкурсы и самые свежие новости игрового мира!",
    members: "10 000+",
    icon: "/brands/telegram.svg",
    tile: "#229ED9",
    href: "https://t.me/gport",
  },
  {
    handle: "GPort Official",
    description: "Юмор, розыгрыши и уникальные акции ждут вас!",
    members: "1 900+",
    icon: "/brands/vk-white.svg",
    tile: "#0077FF",
    href: "https://vk.com/gport",
  },
] as const;

/** Stats + social networks band before the news block (reference layout):
 * two gradient stat cards and a wide social card with subscribe links. */
export function CommunitySection() {
  return (
    <section className="pb-16">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2">
          {STATS.map((stat) => (
            <article
              key={stat.badge}
              className="border-border relative flex min-h-64 flex-col overflow-hidden rounded-3xl border bg-surface p-6 sm:p-8"
            >
              <div aria-hidden className={cn("pointer-events-none absolute inset-0", stat.wash)} />
              <span
                aria-hidden
                className={cn("bg-raised/50 absolute top-16 -right-5 size-24 rotate-12 rounded-3xl", stat.square)}
              />
              <span
                aria-hidden
                className={cn("bg-raised/40 absolute -right-8 bottom-10 size-16 -rotate-6 rounded-2xl", stat.square)}
              />
              <span className="border-border bg-canvas/80 relative inline-flex w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold tracking-wider text-foreground/80 uppercase">
                {stat.badge}
              </span>
              <div className="relative mt-auto pt-8">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-xl font-semibold">{stat.prefix}</span>
                  <span className="text-gradient text-5xl font-extrabold tabular-nums sm:text-6xl">
                    {stat.value.toLocaleString("ru-RU")}
                  </span>
                </p>
                <p className="mt-1 text-xl font-semibold">{stat.caption}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="border-border relative mt-4 overflow-hidden rounded-3xl border bg-surface p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(34rem_16rem_at_15%_0%,rgb(139_92_246/0.12),transparent_70%),radial-gradient(34rem_16rem_at_85%_100%,rgb(85_221_229/0.1),transparent_70%)]"
          />
          <span className="border-border bg-canvas/80 relative inline-flex w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold tracking-wider text-foreground/80 uppercase">
            Наши социальные сети
          </span>

          <div className="relative mt-8 grid gap-10 lg:grid-cols-2">
            {SOCIALS.map((social) => (
              <div key={social.handle} className="flex gap-4">
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-2xl"
                  style={{ backgroundColor: social.tile }}
                >
                  <Image src={social.icon} alt="" width={28} height={28} className="size-7 object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold">{social.handle}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {social.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <span className="border-border bg-canvas/70 rounded-xl border px-4 py-2">
                      <span className="block text-sm font-bold">{social.members}</span>
                      <span className="text-muted-foreground block text-xs">регулярных юзеров</span>
                    </span>
                    <Button variant="outline" asChild>
                      <a href={social.href} target="_blank" rel="noreferrer">
                        Подписаться
                        <Image src={social.icon} alt="" width={18} height={18} className="size-4.5 object-contain" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </Container>
    </section>
  );
}

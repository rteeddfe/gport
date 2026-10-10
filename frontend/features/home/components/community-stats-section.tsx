import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import type { HomeCommunityCard, HomeStatCard } from "@/types/api";

/** Built-in icon and tile color per community brand. */
const BRAND_STYLES: Record<
  HomeCommunityCard["brand"],
  { icon: string; color: string }
> = {
  telegram: { icon: "/brands/telegram.svg", color: "#229ED9" },
  vk: { icon: "/brands/vk-white.svg", color: "#0077FF" },
};

function statBadgeClass(): string {
  return "border-border bg-canvas/80 text-foreground/80 relative inline-flex w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase";
}

function StatCard({ card, index }: { card: HomeStatCard; index: number }) {
  const isEven = index % 2 === 0;
  return (
    <article className="border-border relative flex min-h-64 flex-col overflow-hidden rounded-3xl border bg-surface p-6 sm:p-8">
      <div
        aria-hidden="true"
        className={
          isEven
            ? "pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_16rem_at_85%_10%,rgb(85_221_229/0.16),transparent_70%)]"
            : "pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_16rem_at_85%_10%,rgb(139_92_246/0.2),transparent_70%)]"
        }
      />
      {isEven ? (
        <>
          <span aria-hidden="true" className="bg-raised/60 absolute top-16 -right-5 size-24 rotate-12 rounded-3xl" />
          <span aria-hidden="true" className="bg-raised/60 absolute -right-8 bottom-10 size-16 -rotate-6 rounded-2xl" />
        </>
      ) : (
        <>
          <span aria-hidden="true" className="bg-brand/10 absolute top-16 -right-5 size-24 rotate-12 rounded-3xl" />
          <span aria-hidden="true" className="bg-brand/10 absolute -right-8 bottom-10 size-16 -rotate-6 rounded-2xl" />
        </>
      )}
      <span className={statBadgeClass()}>{card.label}</span>
      <div className="relative mt-auto pt-8">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-xl font-semibold">{card.prefix}</span>
          <span className="text-gradient text-5xl font-extrabold tabular-nums sm:text-6xl">
            {card.value}
          </span>
        </p>
        <p className="mt-1 text-xl font-semibold">{card.description}</p>
      </div>
    </article>
  );
}

function CommunityCard({ card }: { card: HomeCommunityCard }) {
  const style = BRAND_STYLES[card.brand] ?? BRAND_STYLES.telegram;
  return (
    <div className="flex gap-4">
      <span
        className="grid size-14 shrink-0 place-items-center rounded-2xl"
        style={{ backgroundColor: style.color }}
      >
        <Image
          src={style.icon}
          alt=""
          width={28}
          height={28}
          className="size-7 object-contain"
        />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold">{card.name}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {card.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span className="border-border bg-canvas/70 rounded-xl border px-4 py-2">
            <span className="block text-sm font-bold">{card.usersCount}</span>
            <span className="text-muted-foreground block text-xs">
              {card.usersLabel}
            </span>
          </span>
          <Button asChild variant="outline">
            <a href={card.url} target="_blank" rel="noreferrer">
              Подписаться
              <Image
                src={style.icon}
                alt=""
                width={18}
                height={18}
                className="size-4.5 object-contain"
              />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Home trust block before the news, edited from the admin
 * «Главная страница» tab: stat cards (clients, top-ups) plus the
 * community card with the join buttons. Empty rows drop out; the whole
 * section hides when nothing is configured. */
export function CommunityStatsSection({
  statCards,
  communityLabel,
  communityCards,
}: {
  statCards: HomeStatCard[];
  communityLabel: string;
  communityCards: HomeCommunityCard[];
}) {
  const stats = statCards.filter((card) => card.value.trim() !== "");
  const communities = communityCards.filter(
    (card) => card.name.trim() !== "" && card.url.trim() !== "",
  );
  if (stats.length === 0 && communities.length === 0) {
    return null;
  }
  return (
    <section className="pb-16">
      <Container>
        {stats.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((card, index) => (
              <StatCard key={card.value + index} card={card} index={index} />
            ))}
          </div>
        ) : null}
        {communities.length > 0 ? (
          <article className="border-border relative mt-4 overflow-hidden rounded-3xl border bg-surface p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(34rem_16rem_at_15%_0%,rgb(139_92_246/0.12),transparent_70%),radial-gradient(34rem_16rem_at_85%_100%,rgb(85_221_229/0.1),transparent_70%)]"
            />
            <span className={statBadgeClass()}>{communityLabel}</span>
            <div className="relative mt-8 grid gap-10 lg:grid-cols-2">
              {communities.map((card) => (
                <CommunityCard key={card.url + card.name} card={card} />
              ))}
            </div>
          </article>
        ) : null}
      </Container>
    </section>
  );
}

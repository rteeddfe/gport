import { Container } from "@/components/layout/container";
import { CommunityStatsSection } from "@/features/home/components/community-stats-section";
import { FaqSection } from "@/features/home/components/faq-section";
import { GameCurrencySection } from "@/features/home/components/game-currency-section";
import { GamesSection } from "@/features/home/components/games-section";
import { HeroBanner } from "@/features/home/components/hero-banner";
import { HeroServices } from "@/features/home/components/hero-services";
import { NewsSection } from "@/features/home/components/news-section";
import { ReviewsSection } from "@/features/home/components/reviews-section";
import { TopupBanner } from "@/features/topup/components/topup-banner";
import { formatDateLong } from "@/lib/format";
import { getHomeContent } from "@/services/home-content.service";
import { getPosts } from "@/services/posts.service";
import { getReviews } from "@/services/reviews.service";
import { getFallbackLogo } from "@/services/settings.service";

/** The homepage carousel shows up to 10 latest published reviews. */
const HOMEPAGE_REVIEWS_LIMIT = 10;

/** The news block shows the 3 latest published posts. */
const HOMEPAGE_NEWS_LIMIT = 3;

export default async function HomePage() {
  const heroContent = await getHomeContent().catch(() => null);
  const logoUrl = await getFallbackLogo();
  const reviews = await getReviews({ page: 1, limit: HOMEPAGE_REVIEWS_LIMIT }).catch(
    () => null,
  );
  const posts = await getPosts({ page: 1, limit: HOMEPAGE_NEWS_LIMIT }).catch(() => null);

  return (
    <>
      <HeroBanner content={heroContent ?? undefined} />
      {/* Top-up block: a real checkout for the admin-picked services
          (settings → «Главная страница» → «Сервисы формы пополнения»);
          hidden until services are configured. */}
      <section className="pb-16">
        <Container>
          <TopupBanner services={heroContent?.topupServices} />
        </Container>
      </section>
      {/* Service wall: admin-picked top-up services → legacy image cards →
          the built-in service tiles. */}
      <HeroServices
        cards={heroContent?.wallCards}
        serviceCards={heroContent?.serviceCards}
      />
      {/* The three catalog sections: service top-ups (the wall above),
          game currency and games. */}
      <GameCurrencySection logoUrl={logoUrl} />
      <GamesSection logoUrl={logoUrl} />
      <ReviewsSection
        reviews={(reviews?.items ?? []).map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          text: review.text,
          dateLabel: formatDateLong(review.createdAt),
        }))}
      />
      <CommunityStatsSection
        statCards={heroContent?.statCards ?? []}
        communityLabel={heroContent?.communityLabel ?? ""}
        communityCards={heroContent?.communityCards ?? []}
      />
      <NewsSection posts={posts?.items ?? []} logoUrl={logoUrl} />
      <FaqSection />
    </>
  );
}

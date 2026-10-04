import { Container } from "@/components/layout/container";
import { CommunitySection } from "@/features/home/components/community-section";
import { FaqSection } from "@/features/home/components/faq-section";
import { GameCurrencySection } from "@/features/home/components/game-currency-section";
import { HeroBanner } from "@/features/home/components/hero-banner";
import { HeroServices } from "@/features/home/components/hero-services";
import { NewsSection } from "@/features/home/components/news-section";
import { ReviewsSection } from "@/features/home/components/reviews-section";
import { TopupBanner } from "@/features/topup/components/topup-banner";
import { formatReviewDate } from "@/features/reviews/components/review-card";
import { getHomeContent } from "@/services/home-content.service";
import { getPosts } from "@/services/posts.service";
import { getReviews } from "@/services/reviews.service";

/** The homepage carousel shows up to 10 latest published reviews. */
const HOMEPAGE_REVIEWS_LIMIT = 10;

/** The news block shows the 3 latest published posts. */
const HOMEPAGE_NEWS_LIMIT = 3;

export default async function HomePage() {
  const heroContent = await getHomeContent().catch(() => null);
  const reviews = await getReviews({ page: 1, limit: HOMEPAGE_REVIEWS_LIMIT }).catch(
    () => null,
  );
  const posts = await getPosts({ page: 1, limit: HOMEPAGE_NEWS_LIMIT }).catch(() => null);

  return (
    <>
      <HeroBanner content={heroContent ?? undefined} />
      {/* Top-up block: the «Баннер» layout chosen from the layout variants. */}
      <section className="pb-16">
        <Container>
          <TopupBanner />
        </Container>
      </section>
      <HeroServices />
      <GameCurrencySection />
      <ReviewsSection
        reviews={(reviews?.items ?? []).map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          text: review.text,
          dateLabel: formatReviewDate(review.createdAt),
        }))}
      />
      <CommunitySection />
      <NewsSection posts={posts?.items ?? []} />
      <FaqSection />
    </>
  );
}

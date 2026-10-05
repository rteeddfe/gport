import { CatalogSection } from "./catalog-section";

/** Home block «Игры»: published key products of the `games` category. */
export function GamesSection() {
  return (
    <CatalogSection
      categorySlug="games"
      kicker="Игры"
      title={
        <>
          Игры <span className="text-gradient">по честным ценам</span>
        </>
      }
      moreHref="/products?category=games"
    />
  );
}

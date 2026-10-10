import { CatalogSection } from "./catalog-section";

/** Home block «Игровые валюты»: published products of the `game-currency`
 * category, priced «from» per product. */
export function GameCurrencySection({ logoUrl = "" }: { logoUrl?: string }) {
  return (
    <CatalogSection
      categorySlug="game-currency"
      kicker="Игровые валюты"
      title={
        <>
          Валюта для <span className="text-gradient">любимых игр</span>
        </>
      }
      moreHref="/products?category=game-currency"
      logoUrl={logoUrl}
    />
  );
}

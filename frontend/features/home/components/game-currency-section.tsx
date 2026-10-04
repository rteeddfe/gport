import { Container } from "@/components/layout/container";
import { getProducts } from "@/services/products.service";
import { GameCurrencyGrid } from "./game-currency-grid";

const CATEGORY_SLUG = "game-currency";
const MAX_CARDS = 11;

/**
 * Home block «Игровые валюты»: published products of the `game-currency`
 * category, styled after the reference poster grid (portrait cover,
 * title, price). Server-fetched like the /products page — if the API is
 * down or the category has no published products, the block renders
 * nothing instead of an error box (SystemStatus already surfaces the
 * backend state below). Rendering with motion lives in the client
 * `GameCurrencyGrid`.
 */
export async function GameCurrencySection() {
  let items: Awaited<ReturnType<typeof getProducts>>["items"] = [];
  try {
    const result = await getProducts({ categorySlug: CATEGORY_SLUG, limit: MAX_CARDS });
    items = result.items;
  } catch {
    return null;
  }
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="pb-16">
      <Container>
        <GameCurrencyGrid items={items} />
      </Container>
    </section>
  );
}

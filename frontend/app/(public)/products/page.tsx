import { getErrorMessage } from "@/lib/api/errors";
import { getProducts } from "@/services/products.service";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Products" };

function formatPrice(priceCents: number, currency: string): string {
  return `${(priceCents / 100).toFixed(2)} ${currency}`;
}

/**
 * Server Component: fetches through the REST API (service -> api client) and
 * renders plain markup — no client JS needed for this page.
 */
export default async function ProductsPage() {
  let items: Awaited<ReturnType<typeof getProducts>>["items"] = [];
  let errorMessage: string | null = null;

  try {
    const result = await getProducts({ limit: 20 });
    items = result.items;
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Products</h1>
      <p className="text-muted-foreground mt-1">
        Loaded from the NestJS API through the service layer (Server Component).
      </p>

      <div className="mt-8">
        {errorMessage ? (
          <ErrorState title="API error" message={errorMessage} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Run the backend seed to add test data."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{product.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {product.category?.name ?? "Uncategorized"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums">
                    {formatPrice(product.priceCents, product.currency)}
                  </span>
                  <Badge variant="secondary">{product.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

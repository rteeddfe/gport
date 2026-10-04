"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "./product-form";
import { useAdminProduct } from "../hooks/use-admin-products";

/** Data wrapper: loads the product on the edit page, renders the bare
 * form on the create page. */
export function ProductFormSection({ productId }: { productId?: string }) {
  const query = useAdminProduct(productId);

  if (productId !== undefined) {
    if (query.isPending) {
      return <Skeleton className="h-96 w-full" />;
    }
    if (query.isError) {
      return (
        <p className="text-destructive text-sm">
          Не удалось загрузить товар: {query.error.message}
        </p>
      );
    }
    return <ProductForm product={query.data} />;
  }
  return <ProductForm />;
}

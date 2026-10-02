import { useQuery } from "@tanstack/react-query";
import { getProducts, type FindProductsParams } from "@/services/products.service";

export function useProducts(params: FindProductsParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
  });
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useProducts } from "@/features/products/hooks/use-products";

const getProductsMock = jest.fn();
jest.mock("@/services/products.service", () => ({
  getProducts: (...args: unknown[]) => getProductsMock(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const paginated = {
  items: [
    {
      id: "p1",
      title: "Test product",
      slug: "test-product",
      description: null,
      priceCents: 1000,
      currency: "USD",
      status: "PUBLISHED",
      categoryId: "c1",
      sellerId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  pages: 1,
};

describe("useProducts", () => {
  it("loads products through the service layer", async () => {
    getProductsMock.mockResolvedValue(paginated);

    const { result } = renderHook(() => useProducts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0]?.title).toBe("Test product");
  });

  it("exposes an error when the API call fails", async () => {
    getProductsMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useProducts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

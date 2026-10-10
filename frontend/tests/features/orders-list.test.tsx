import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { OrdersList } from "@/features/account/components/orders-list";
import type { OrderView } from "@/types/api";

const mockGetMyOrders = jest.fn();
jest.mock("@/services/orders.service", () => ({
  getMyOrders: (...args: unknown[]) => mockGetMyOrders(...args),
}));

jest.mock("next/image", () => ({
  // jsdom has no image layout — render a plain marker.
  default: () => <img alt="" />,
}));

function renderOrders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrdersList />
    </QueryClientProvider>,
  );
}

function makeOrder(overrides: Partial<OrderView> & Pick<OrderView, "id" | "status">): OrderView {
  return {
    totalCents: 250_000,
    currency: "RUB",
    provider: "test",
    createdAt: "2026-10-08T10:00:00.000Z",
    paidAt: null,
    items: [
      {
        id: "item-1",
        productSlug: "cyberpunk-2077",
        productTitle: "Cyberpunk 2077",
        productImage: null,
        unitPriceCents: 250_000,
        quantity: 1,
        variantLabel: null,
        accountIdentifier: null,
        instruction: null,
        amountCents: null,
        commissionCents: null,
        keys: [],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mockGetMyOrders.mockReset();
});

describe("OrdersList (M-PAYMENTS-1: paid orders must be visible in the account)", () => {
  it("renders a PAID order with its badge — a paid order is never filtered out", async () => {
    mockGetMyOrders.mockResolvedValue([
      makeOrder({ id: "aaaaaaaa-1111-4111-8111-000000000001", status: "PAID" }),
    ]);
    renderOrders();

    expect(await screen.findByText("Оплачен")).toBeInTheDocument();
    expect(screen.getByText(/Cyberpunk 2077/)).toBeInTheDocument();
  });

  it("renders orders in every lifecycle state, including pending and cancelled", async () => {
    mockGetMyOrders.mockResolvedValue([
      makeOrder({ id: "aaaaaaaa-0000-0000-0000-000000000002", status: "AWAITING_PAYMENT" }),
      makeOrder({ id: "aaaaaaaa-1111-1111-1111-000000000003", status: "CANCELLED" }),
    ]);
    renderOrders();

    expect(await screen.findByText("Ожидает оплаты")).toBeInTheDocument();
    expect(screen.getByText("Отменён")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockGetMyOrders.mockResolvedValue([]);
    renderOrders();

    expect(await screen.findByText("Заказов пока нет")).toBeInTheDocument();
  });

  it("surfaces API errors safely", async () => {
    mockGetMyOrders.mockRejectedValue(new Error("403"));
    renderOrders();

    expect(
      await screen.findByText(/не удалось загрузить заказы/i),
    ).toBeInTheDocument();
  });

  it("shows delivered keys when present", async () => {
    mockGetMyOrders.mockResolvedValue([
      makeOrder({
        id: "aaaaaaaa-1111-1111-1111-000000000004",
        status: "PAID",
        items: [
          {
            ...makeOrder({ id: "x", status: "PAID" }).items[0],
            keys: ["KEY-ABC-1"],
          },
        ],
      }),
    ]);
    renderOrders();

    expect(await screen.findByText("KEY-ABC-1")).toBeInTheDocument();
  });
});

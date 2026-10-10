import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestPayForm } from "@/features/payments/components/test-pay-form";
import type { TestSessionView } from "@/types/api";

const push = jest.fn();
const meMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/features/auth/hooks/use-me", () => ({
  useMe: () => meMock(),
}));

const mockFetch = jest.fn();

const SESSION: TestSessionView = {
  orderId: "aaaaaaaa-1111-4111-8111-000000000001",
  status: "AWAITING_PAYMENT",
  amountCents: 250_000,
  currency: "RUB",
  description: "Cyberpunk 2077",
};

beforeEach(() => {
  jest.clearAllMocks();
  // The same-origin route handler the emulator page completes through.
  global.fetch = mockFetch;
});

describe("TestPayForm (M-PAYMENTS-1 emulator redirect)", () => {
  it("a signed-in buyer lands in their orders after a successful payment", async () => {
    const user = userEvent.setup();
    meMock.mockReturnValue({ data: { id: "u1", email: "buyer@gport.local" } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, status: "PAID" }),
    });
    render(<TestPayForm session={SESSION} token="tok" />);

    await user.click(screen.getByRole("button", { name: /оплатить/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/dashboard/orders");
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/payments/test/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "tok", outcome: "success" }),
      }),
    );
  });

  it("a guest goes back to the storefront, never into the dashboard", async () => {
    const user = userEvent.setup();
    meMock.mockReturnValue({ data: undefined });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, status: "PAID" }),
    });
    render(<TestPayForm session={SESSION} token="tok" />);

    await user.click(screen.getByRole("button", { name: /оплатить/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
    });
  });

  it("a failed completion shows the safe error and keeps the buttons enabled", async () => {
    const user = userEvent.setup();
    meMock.mockReturnValue({ data: undefined });
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Платёжный шлюз отклонил операцию" }),
    });
    render(<TestPayForm session={SESSION} token="tok" />);

    await user.click(screen.getByRole("button", { name: /оплатить/i }));

    expect(
      await screen.findByText(/платёжный шлюз отклонил операцию/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /оплатить/i })).toBeEnabled();
  });
});

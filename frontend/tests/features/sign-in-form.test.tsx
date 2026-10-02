import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "@/features/auth/components/sign-in-form";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

const signInMock = jest.fn();
jest.mock("@/services/auth.service", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SignInForm", () => {
  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("submits valid credentials to the auth service", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", email: "a@b.co", name: null, role: "USER" },
    });
    renderWithProviders(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        { email: "a@b.co", password: "secret123" },
        expect.anything(),
      );
    });
  });
});

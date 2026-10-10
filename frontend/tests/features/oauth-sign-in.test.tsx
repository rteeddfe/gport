import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SignInForm,
  type OAuthState,
} from "@/features/auth/components/sign-in-form";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const verifyOAuthLinkMock = jest.fn();
jest.mock("@/services/auth.service", () => ({
  signIn: jest.fn(),
  verifyOAuthLink: (...args: unknown[]) => verifyOAuthLinkMock(...args),
}));

const mockPush = jest.fn();

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const CHALLENGE = "00000000-0000-4000-8000-0000000000aa";

function state(
  partial: Partial<OAuthState> & { code: OAuthState["code"] },
): OAuthState {
  return partial as OAuthState;
}

describe("OAuth sign-in (M-OAUTH-5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders both provider buttons as real navigation links to the backend start endpoints", () => {
    renderWithProviders(<SignInForm />);

    // OAuth start is a GET navigation — plain anchors, never fetch, no SDK.
    const yandex = screen.getByRole("link", { name: /войти через яндекс/i });
    const vk = screen.getByRole("link", { name: /войти через vk/i });
    expect(yandex).toHaveAttribute("href", "/api/auth/oauth/yandex/start");
    expect(vk).toHaveAttribute("href", "/api/auth/oauth/vk/start");
  });

  it("oauth=email shows a safe provider-email error", () => {
    renderWithProviders(<SignInForm oauth={state({ code: "email" })} />);
    expect(screen.getByText(/провайдер не передал email/i)).toBeInTheDocument();
  });

  it("oauth=failed shows the generic OAuth error without technical details", () => {
    renderWithProviders(<SignInForm oauth={state({ code: "failed" })} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/не удалось выполнить вход через oauth/i);
    // No leaks of any technical value.
    expect(alert.textContent).not.toMatch(/state|token/i);
  });

  it("oauth=link without a well-formed challenge degrades to the safe error", () => {
    renderWithProviders(<SignInForm oauth={state({ code: "link" })} />);
    expect(screen.queryByLabelText(/код подтверждения/i)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /не удалось выполнить вход через oauth/i,
    );

    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: "not-a-uuid" })} />,
    );
    expect(screen.queryByLabelText(/код подтверждения/i)).not.toBeInTheDocument();
  });

  it("oauth=link with a challenge shows the code verification screen", () => {
    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: CHALLENGE })} />,
    );
    expect(
      screen.getByText(/на вашу почту отправлен код подтверждения/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/код подтверждения/i)).toBeInTheDocument();
  });

  it("does not submit until the code has exactly 6 digits", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: CHALLENGE })} />,
    );
    const codeInput = screen.getByLabelText(/код подтверждения/i);
    const submit = screen.getByRole("button", { name: /подтвердить/i });

    await user.type(codeInput, "1234");
    expect(submit).toBeDisabled();
    expect(verifyOAuthLinkMock).not.toHaveBeenCalled();

    await user.type(codeInput, "56");
    expect(submit).toBeEnabled();

    // Non-digits are stripped client-side.
    await user.clear(codeInput);
    await user.type(codeInput, "12ab34");
    expect(codeInput).toHaveValue("1234");
  });

  it("submits the code with the challenge id and redirects to the dashboard on success", async () => {
    const user = userEvent.setup();
    verifyOAuthLinkMock.mockResolvedValue({ user: { id: "u1" } });
    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: CHALLENGE })} />,
    );

    await user.type(screen.getByLabelText(/код подтверждения/i), "123456");
    await user.click(screen.getByRole("button", { name: /подтвердить/i }));

    await waitFor(() => {
      expect(verifyOAuthLinkMock).toHaveBeenCalledWith(
        { challengeId: CHALLENGE, code: "123456" },
        expect.anything(),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
    // The code rides only in the POST body — never in a URL.
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringMatching(/123456/));
  });

  it("a backend 400 shows the safe message and the resend hint", async () => {
    const user = userEvent.setup();
    verifyOAuthLinkMock.mockRejectedValue(
      Object.assign(new Error("Код недействителен или истёк"), { status: 400 }),
    );
    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: CHALLENGE })} />,
    );

    await user.type(screen.getByLabelText(/код подтверждения/i), "000000");
    await user.click(screen.getByRole("button", { name: /подтвердить/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /код недействителен или истёк/i,
    );
    expect(screen.getByText(/запросите новый код/i)).toBeInTheDocument();
  });

  it("a network failure shows a safe error", async () => {
    const user = userEvent.setup();
    verifyOAuthLinkMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithProviders(
      <SignInForm oauth={state({ code: "link", challengeId: CHALLENGE })} />,
    );

    await user.type(screen.getByLabelText(/код подтверждения/i), "123456");
    await user.click(screen.getByRole("button", { name: /подтвердить/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

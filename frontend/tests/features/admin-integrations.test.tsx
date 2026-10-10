import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegrationsSection } from "@/features/admin/components/integrations-section";

const mockGetIntegrations = jest.fn();
const mockUpdateIntegration = jest.fn();
jest.mock("@/services/integrations.service", () => ({
  adminGetIntegrations: () => mockGetIntegrations(),
  adminUpdateIntegration: (...args: unknown[]) => mockUpdateIntegration(...args),
  adminRemoveIntegrationSecret: jest.fn(),
  adminRemoveIntegration: jest.fn(),
}));

const mockMe = jest.fn();
jest.mock("@/features/auth/hooks/use-me", () => ({
  useMe: () => mockMe(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntegrationsSection />
    </QueryClientProvider>,
  );
}

const YANDEX_VIEW = {
  provider: "YANDEX",
  type: "OAUTH",
  title: "Yandex OAuth",
  description: "Вход пользователей через Яндекс ID",
  enabled: false,
  config: {
    clientId: "cid-1",
    redirectUri: "https://api.gport.test/api/auth/oauth/yandex/callback",
  },
  configured: true,
  secretsConfigured: { clientSecret: true },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const VK_VIEW = {
  provider: "VK",
  type: "OAUTH",
  title: "VK OAuth",
  description: "Вход пользователей через VK ID",
  enabled: false,
  config: { clientId: "", redirectUri: "" },
  configured: false,
  secretsConfigured: { clientSecret: false },
  updatedAt: null,
};

beforeEach(() => {
  mockGetIntegrations.mockReset();
  mockUpdateIntegration.mockReset();
  mockMe.mockReset();
});

describe("Admin integrations UI (M-INTEGRATIONS-1)", () => {
  it("renders a card per registered provider with the configured status", async () => {
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockResolvedValue([YANDEX_VIEW, VK_VIEW]);
    renderSection();

    expect(await screen.findByLabelText(/интеграция yandex oauth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/интеграция vk oauth/i)).toBeInTheDocument();
    expect(screen.getAllByText("Настроено").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Не настроено").length).toBeGreaterThan(0);
  });

  it("never renders a stored secret — the secret input mounts empty with a configured hint", async () => {
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    // The mocked service payload leaks the value on purpose: the UI must not render it.
    const storedSecret = "super-plain-secret-never-shown";
    mockGetIntegrations.mockResolvedValue([{ ...YANDEX_VIEW, clientSecret: storedSecret }]);
    renderSection();

    const secretInput = await screen.findByLabelText(/client secret/i);
    expect(secretInput).toHaveAttribute("type", "password");
    expect(secretInput).toHaveValue("");
    expect(screen.queryByDisplayValue(storedSecret)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(storedSecret);
  });

  it("renders the redirect URI as a backend-controlled config field", async () => {
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockResolvedValue([YANDEX_VIEW]);
    renderSection();

    const redirect = await screen.findByDisplayValue(
      "https://api.gport.test/api/auth/oauth/yandex/callback",
    );
    // Editable (DB-backed since M-INTEGRATIONS-2) — the backend allowlist,
    // not the form, is what keeps it from becoming an arbitrary URL.
    expect(redirect).not.toBeDisabled();
    expect(
      screen.getByText(/произвольный url будет отклонён/i),
    ).toBeInTheDocument();
  });

  it("flags an enabled integration with an incomplete configuration", async () => {
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockResolvedValue([
      { ...VK_VIEW, enabled: true },
    ]);
    renderSection();

    expect(
      await screen.findByText(/неполная конфигурация/i),
    ).toBeInTheDocument();
  });

  it("saves config; an empty secret field means keep the stored one", async () => {
    const user = userEvent.setup();
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockResolvedValue([YANDEX_VIEW]);
    mockUpdateIntegration.mockResolvedValue(YANDEX_VIEW);
    renderSection();

    const clientId = await screen.findByLabelText(/^client id/i);
    await user.clear(clientId);
    await user.type(clientId, "new-client-id");
    // The secret field stays empty: the stored secret must not be replaced.
    await user.click(screen.getByRole("button", { name: /сохранить/i }));

    await waitFor(() => {
      expect(mockUpdateIntegration).toHaveBeenCalledWith("YANDEX", {
        enabled: false,
        config: {
          clientId: "new-client-id",
          redirectUri: "https://api.gport.test/api/auth/oauth/yandex/callback",
        },
        secrets: {},
      });
    });
  });

  it("sends a non-empty secret only when the admin typed a replacement", async () => {
    const user = userEvent.setup();
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockResolvedValue([YANDEX_VIEW]);
    mockUpdateIntegration.mockResolvedValue(YANDEX_VIEW);
    renderSection();

    const secretInput = await screen.findByLabelText(/client secret/i);
    await user.type(secretInput, "brand-new-secret");
    await user.click(screen.getByRole("button", { name: /сохранить/i }));

    await waitFor(() => {
      expect(mockUpdateIntegration).toHaveBeenCalledWith(
        "YANDEX",
        expect.objectContaining({
          secrets: { clientSecret: "brand-new-secret" },
        }),
      );
    });
  });

  it("renders read-only for a non-SUPER_ADMIN session (permission-based UI)", async () => {
    mockMe.mockReturnValue({ data: { role: "ADMIN", permissions: ["integrations"] } });
    mockGetIntegrations.mockResolvedValue([YANDEX_VIEW]);
    renderSection();

    const clientId = await screen.findByLabelText(/^client id/i);
    expect(clientId).toBeDisabled();
    expect(screen.queryByRole("button", { name: /сохранить/i })).not.toBeInTheDocument();
  });

  it("shows the load error state", async () => {
    mockMe.mockReturnValue({ data: { role: "SUPER_ADMIN", permissions: [] } });
    mockGetIntegrations.mockRejectedValue(new Error("boom"));
    renderSection();

    expect(await screen.findByText(/не удалось загрузить интеграции/i)).toBeInTheDocument();
  });
});

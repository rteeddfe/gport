import fs from "fs";
import path from "path";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditLogTable } from "@/features/admin/components/audit-log-table";
import type { AuditLogView } from "@/types/api";

const mockGetAuditLogs = jest.fn();
jest.mock("@/services/audit.service", () => ({
  adminGetAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
}));

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogTable />
    </QueryClientProvider>,
  );
}

const ENTRY: AuditLogView = {
  id: "aaaaaaaa-1111-4111-8111-000000000001",
  actorUserId: "00000000-0000-0000-0000-0000000000aa",
  actorRole: "SUPER_ADMIN",
  action: "integration.secret_set",
  entityType: "integration",
  entityId: "YANDEX",
  metadata: { secretField: "clientSecret", operation: "set" },
  ipAddress: "203.0.113.9",
  userAgent: "vitest-agent",
  createdAt: "2026-10-08T10:00:00.000Z",
};

const PAGE = { items: [ENTRY], total: 1, page: 1, limit: 20, pages: 1 };

beforeEach(() => {
  mockGetAuditLogs.mockReset();
});

describe("Admin audit log page (M-AUDIT-1)", () => {
  it("renders audit entries with action, entity and metadata as plain text", async () => {
    mockGetAuditLogs.mockResolvedValue(PAGE);
    renderTable();

    expect(await screen.findByText("integration.secret_set")).toBeInTheDocument();
    expect(screen.getByText(/YANDEX/i)).toBeInTheDocument();
    // Metadata is rendered as text content — safe by construction.
    expect(screen.getByText(/"operation":"set"/)).toBeInTheDocument();
  });

  it("shows the actor as a short id with the role in the tooltip, never raw values", async () => {
    mockGetAuditLogs.mockResolvedValue(PAGE);
    renderTable();

    const actor = await screen.findByTitle(
      `${ENTRY.actorUserId} · ${ENTRY.actorRole}`,
    );
    expect(actor).toHaveTextContent("00000000…");
  });

  it("sends the action filter to the API", async () => {
    const user = userEvent.setup();
    mockGetAuditLogs.mockResolvedValue({ ...PAGE, items: [] });
    renderTable();

    const action = await screen.findByLabelText(/действие/i);
    await user.type(action, "integration.updated");

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: "integration.updated" }),
      );
    });
  });

  it("paginates forward", async () => {
    const user = userEvent.setup();
    mockGetAuditLogs.mockResolvedValue({
      items: [],
      total: 40,
      page: 1,
      limit: 20,
      pages: 2,
    });
    renderTable();

    await user.click(await screen.findByRole("button", { name: /дальше/i }));

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
      );
    });
  });

  it("shows the API error state", async () => {
    mockGetAuditLogs.mockRejectedValue(new Error("403"));
    renderTable();

    expect(
      await screen.findByText(/не удалось загрузить журнал/i),
    ).toBeInTheDocument();
  });

  it("never renders metadata through the dangerouslySetInnerHTML attribute", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "../../features/admin/components/audit-log-table.tsx",
      ),
      "utf8",
    );
    // The component comment mentions the term; only the JSX attribute matters.
    expect(source.includes("dangerouslySetInnerHTML={")).toBe(false);
  });
});

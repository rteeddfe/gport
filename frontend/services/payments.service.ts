import { apiFetch } from "@/lib/api/client";
import type {
  EmailLogView,
  PaymentMethod,
  PaymentSettingsInput,
  PaymentSettingsView,
  TestSessionView,
} from "@/types/api";

/** Enabled payment methods for the buy dialog (public). */
export function getPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>("/payments/methods");
}

/** Emulated acquiring session — the capability token authorizes the read. */
export function getTestSession(token: string): Promise<TestSessionView> {
  return apiFetch<TestSessionView>(`/payments/test/session/${token}`);
}

export function getPaymentSettings(): Promise<PaymentSettingsView> {
  return apiFetch<PaymentSettingsView>("/admin/payments/settings");
}

export function updatePaymentSettings(
  input: PaymentSettingsInput,
): Promise<PaymentSettingsView> {
  return apiFetch<PaymentSettingsView, PaymentSettingsInput>(
    "/admin/payments/settings",
    { method: "PUT", body: input },
  );
}

export function adminGetEmails(limit = 20): Promise<EmailLogView[]> {
  return apiFetch<EmailLogView[]>(`/admin/payments/emails?limit=${limit}`);
}

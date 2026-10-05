import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const DEV_WEBHOOK_SECRET = "dev-test-acquiring-secret";

function apiBase(): string {
  // Server-side base of the API (no same-origin /api proxy here — the
  // emulator talks to the API directly, like an acquirer would).
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:3001/api"
  );
}

/**
 * Server side of the TEST acquiring emulator. The emulator page calls
 * this route; the route plays the acquirer's server: it resolves the
 * order by the capability token, signs the callback with the shared
 * webhook secret and POSTs it to the API webhook — the exact handshake a
 * real provider integration will use.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { token?: string; outcome?: string };
  try {
    body = (await request.json()) as { token?: string; outcome?: string };
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const { token, outcome } = body;
  if (!token || (outcome !== "success" && outcome !== "cancel")) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const base = apiBase();
  const session = (await fetch(`${base}/payments/test/session/${token}`).then(
    (response) => (response.ok ? response.json() : null),
    () => null,
  )) as { orderId?: string; status?: string } | null;
  if (!session?.orderId) {
    return NextResponse.json({ error: "Платёж не найден" }, { status: 404 });
  }
  if (session.status && session.status !== "AWAITING_PAYMENT") {
    // Already finalized — report the state, no webhook replay needed.
    return NextResponse.json({ ok: true, status: session.status });
  }

  const secret =
    process.env.PAYMENTS_WEBHOOK_SECRET ?? DEV_WEBHOOK_SECRET;
  const signature = createHmac("sha256", secret)
    .update(`${session.orderId}:${token}:${outcome}`)
    .digest("hex");

  const webhook = await fetch(`${base}/payments/webhook/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: session.orderId,
      paymentToken: token,
      status: outcome,
      signature,
    }),
  }).then(
    (response) => (response.ok ? response.json() : null),
    () => null,
  );
  if (!webhook?.ok) {
    return NextResponse.json(
      { error: "Платёжный шлюз отклонил операцию" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, status: webhook.status });
}

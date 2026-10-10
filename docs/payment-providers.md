# Payment Providers (M-PAYMENTS-1)

Facts file for payment-provider integration. Facts from OFFICIAL
documentation are marked and linked; conclusions drawn from THIS repo's
code are marked as code facts. Nothing here claims a real acquirer is
connected — only the test emulator walks the full lifecycle today.

## Registry (code)

`backend/src/common/constants/payment-providers.ts` — `PAYMENT_PROVIDERS`:

| id | Название | live (код) | Назначение |
| --- | --- | --- | --- |
| `test` | Тестовый магазин (эмуляция) | **true** | test-only acquiring emulator (adapter `backend/src/payments/providers/test-payment.provider.ts`) |
| `tbank` | Т-Банк (EACQ) | false | credentials-only (admin settings UI) |
| `yoomoney` | ЮMoney (Сбер) | false | credentials-only |
| `yookassa` | ЮKassa | false | credentials-only |
| `cloudpayments` | CloudPayments | false | credentials-only |
| `robokassa` | Robokassa | false | credentials-only |

Boundary (code): `payment-provider.interface.ts` (`PaymentProviderAdapter`
— `createPaymentSession`) + `PaymentProviderRegistry` (selection only from
registered adapters; never from client input). Core lifecycle (status
transitions, fulfillment, idempotency, audit) lives in `PaymentsService`;
the emulator's webhook handling is there too (`handleTestWebhook`) until a
second real provider forces the split. Credentials/config storage:
`PaymentSettings` singleton (Prisma); OAuth- and integration-secrets live in
the existing Integrations vault (AES-256-GCM) — no second secret store.

## Compatibility matrix

| Provider | Current state | Create payment | Verify notification | Idempotency | Sandbox | Refund | Remaining |
| --- | --- | --- | --- | --- | --- | --- | --- |
| test (emulator) | implemented | implemented (adapter + capability token) | implemented (HMAC-SHA256 over `orderId:token:status`, shared secret) | DB status transition is conditional (`updateMany where status=AWAITING_PAYMENT`) — replays return current status | not applicable (it IS the test mode) | not applicable | production gated by `PAYMENTS_ALLOW_TEST_EMULATOR` |
| tbank | not implemented (registry entry + settings fields only) | not implemented | not implemented | provider-side: unique `OrderId`; no Idempotence-Key | provider: test base URL + IP allowlist | provider: `/v2/Cancel` doubles as refund | adapter, credentials, E2E |
| yookassa | not implemented (registry entry + settings fields only) | not implemented | not implemented | provider-side: `Idempotence-Key` header | provider: test shop + test keys | provider: `/v3/refunds` | adapter, credentials, E2E |
| yoomoney | not implemented (registry entry only) | not implemented | not implemented | unverified | unverified | unverified | research, adapter |
| cloudpayments | not implemented (registry entry only) | not implemented | not implemented | unverified | unverified | unverified | research, adapter |
| robokassa | not implemented (registry entry + settings fields only) | not implemented | not implemented | unverified | unverified | unverified | research, adapter |

`implemented / partially implemented / not implemented / not applicable /
unverified` — nothing is marked implemented unless it is in the code.

## Т-Банк EACQ (интернет-эквайринг)

Official docs: https://developer.tbank.ru/ (EACQ section:
`https://developer.tbank.ru/eacq/…`).

- **Create payment**: `POST https://securepay.tbank.ru/v2/Init`.
  `TerminalKey` + `Amount` in **kopecks** (must equal the sum of item
  amounts) + unique `OrderId` + `Token`. Response: `PaymentId` + payment
  form URL, initial status `NEW`.
- **Credentials**: `TerminalKey` and `Password` from the Т-Бизнес cabinet;
  the password only ever lives inside the SHA-256 request `Token`.
- **Notification verification**: recompute the token — take all root-level
  notification params except `Token` and nested objects, add `Password`,
  sort by key, concatenate values, SHA-256 → compare. Response must be
  HTTP 200 with body literally `OK` in ≤10 s; retries hourly ×24 h, then
  daily ×1 month, archive 90 days. Port 443 only.
- **Statuses**: `NEW → AUTHORIZED → CONFIRMED` (final success); `CANCELED`,
  `REJECTED`, `REVERSED`, `REFUNDED`, `DEADLINE_EXPIRED` etc. Status check:
  `POST /v2/GetState`.
- **Refund/cancel**: a single `/v2/Cancel` method — cancel at `AUTHORIZED`
  (reversal) or refund a `CONFIRMED` payment; partial via `Amount`.
- **Idempotency**: none documented as a header — uniqueness is the
  merchant-side unique `OrderId` per operation.
- **Test**: production (non-DEMO) terminal against
  `https://rest-api-test.tinkoff.ru/v2`, your IPs must be whitelisted via
  the cabinet; documented test cards.
- **Credentials needed to connect**: TerminalKey + Password (prod), test
  base URL + IP allowlist for sandbox. Nothing else.
- NOTE (environment limitation): `developer.tbank.ru` uses a Russian
  national CA certificate that failed TLS verification in our research
  environment; pages were fetched with the certificate subject verified
  manually. Treat transport as a caveat, content as official.

## ЮKassa

Official: https://yookassa.ru/developers (payment-process, webhooks,
refunds, testing pages were fetched).

- **Create payment**: `POST https://api.yookassa.ru/v3/payments`, HTTP
  Basic (shopId : secretKey), **`Idempotence-Key` header required** on
  POST/DELETE (≤64 chars, remembered 24 h). Amount is a decimal STRING
  (`"100.00"`) + currency. `confirmation: {type: "redirect", return_url}`,
  `metadata.order_id` echoed back. Response `confirmation.confirmation_url`.
- **Statuses**: `pending → waiting_for_capture → succeeded | canceled`;
  capture via `/v3/payments/{id}/capture`, cancel only while
  `waiting_for_capture`.
- **Webhooks**: `payment.succeeded`, `payment.canceled`,
  `payment.waiting_for_capture`, `refund.succeeded`. **No cryptographic
  signature** — official recommendation: re-fetch the object via the API
  (`GET /v3/payments/{id}`) to confirm the status, plus the published
  source-IP allowlist (`185.71.76.0/27`, `185.71.77.0/27`, `77.75.153.0/25`,
  `77.75.156.11`, `77.75.156.35`, `77.75.154.128/25`, IPv6 `2a02:5180::/32`).
  Retries for 24 h until a bare HTTP 200.
- **Refund**: `POST /v3/refunds` + `Idempotence-Key`, only for `succeeded`
  payments; full/partial.
- **Test mode**: separate test shop (dashboard), test secret key, mock
  cards (success `5555555555554444`, decline `5555555555554600`),
  `test: true` flag, no real money.
- **Credentials**: shop ID + secret key (test or production).
- Caveat: rate limits not documented on the fetched pages.

## ЮMoney (Сбер), CloudPayments, Robokassa

Listed in the registry and the admin settings UI only; **no official-doc
research was done in this phase** (no integration requirement yet). Their
official developer portals are to be studied in their own phases — nothing
here should be treated as their documentation.

## Internal status mapping (code)

Internal lifecycle (Prisma `OrderStatus`): `AWAITING_PAYMENT → PAID |
CANCELLED`. Fulfillment gate = the conditional transition itself. When a
real adapter is added, its webhook must map provider statuses onto these
two transitions only (unknown provider statuses must never be treated as
success). Suggested mappings (to be confirmed during the adapter phase):

- Т-Банк: `CONFIRMED` → PAID; `CANCELED`/`REJECTED`/`REVERSED` → CANCELLED;
  all other (non-final) statuses → no transition.
- ЮKassa: `succeeded` → PAID; `canceled` → CANCELLED; `pending`/
  `waiting_for_capture` → keep `AWAITING_PAYMENT`.

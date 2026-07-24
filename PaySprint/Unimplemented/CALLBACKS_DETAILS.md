# PaySprint — Callbacks — Implementation Details

> Compact cheat-sheet. Full: [`CALLBACKS.md`](CALLBACKS.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

Inbound webhooks for onboard / payout / MATM / bus.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | Onboarding | `Webhook` | 📄 |
| 2 | Payout | `Webhook` | 📄 |
| 3 | MATM CW success/fail | `Webhook` | 📄 |
| 4 | MATM BE success/fail | `Webhook` | 📄 |
| 5 | Onboard status | `Webhook` | 📄 |
| 6 | Bus booking | `Webhook` | 📄 |

## 4. Implement fields

Expose HTTPS endpoints; verify source; idempotent writes; reconcile with query APIs.

## 5. Flows

Event → validate → update DB → ack 200 quickly → async reconcile.

## 6. Gotchas

- Typo RESPONSE HANDING
- Signing method TBD
- Never expose internal errors to PaySprint beyond agreed ack

## 7. Provider checklist

- [x] Callback catalog captured
- [ ] Confirm auth of webhooks
- [ ] URL registration process

## Source

[`CALLBACKS.md`](CALLBACKS.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

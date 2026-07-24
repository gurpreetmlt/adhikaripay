# PaySprint — UPI Cashout — Implementation Details

> Compact cheat-sheet. Full: [`UPI_CASHOUT.md`](UPI_CASHOUT.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

SDK-based UPI cashout with token + status.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | upi-cashout-sdk-token-generation | `POST /upi/cashout/get_token` | 📄 |
| 2 | upi-cashout-transaction-status-check | `POST /upi/cashout/txn_status` | 📄 |

## 4. Implement fields

Token API → SDK → status poll + callback.

## 5. Flows

1. `upi/cashout/get_token` (SDK token)
2. Launch SDK / URL with encdata
3. `upi/cashout/txn_status`
4. CALLBACKS section for terminal states


## 6. Gotchas

- encdata in URL is sensitive
- SIT host for demo only

## 7. Provider checklist

- [x] Token + status APIs
- [ ] SDK package version
- [ ] Callback wiring

## Source

[`UPI_CASHOUT.md`](UPI_CASHOUT.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

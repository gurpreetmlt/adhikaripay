# PaySprint — NSDL Cash Deposit — Implementation Details

> Compact cheat-sheet. Full: [`NSDL_CASH_DEPOSIT.md`](NSDL_CASH_DEPOSIT.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

AePS cash deposit rail (NSDL) with ₹100–₹10,000 limits and daily merchant biometric gate.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | Overview / specs | `—` | 📄 |
| 2 | CD Transaction | `TBD — confirm initiate path` | 📄 |
| 3 | CD Status Query | `POST /cashdeposit/V3/Cashdeposit/query` | 📄 |

## 4. Implement fields

| API | Fields |
|-----|--------|
| Query | RAW_BODY → `ackno`, `txnstatus`, `bankrrn`, `settled_id` |
| Limits | 100–10000 INR |


## 5. Flows

2FA → deposit txn → status query. Timeout → pending + query.

## 6. Gotchas

- Only status path clearly in OpenAPI extract
- Typo Aadhhar in PDF
- Do not skip daily 2FA

## 7. Provider checklist

- [x] Overview + status API
- [ ] Confirm initiate endpoint path/body
- [ ] NPCI 2FA enforcement in app

## Source

[`NSDL_CASH_DEPOSIT.md`](NSDL_CASH_DEPOSIT.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

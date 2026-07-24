# PaySprint — Payout — Implementation Details

> Compact cheat-sheet. Full: [`PAYOUT.md`](PAYOUT.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

Account payout rail (add → docs → status → txn → enquire).

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | get-list | `POST /payout/payout/list` | 📄 |
| 2 | add-account | `POST /payout/payout/add` | 📄 |
| 3 | upload-document | `POST /payout/payout/uploaddocument` | 📄 |
| 4 | account-status-check | `POST /payout/Payout/accountstatus` | 📄 |
| 5 | do-transaction | `POST /payout/payout/dotransaction` | 📄 |
| 6 | status-enquiry-7 | `POST /payout/payout/status` | 📄 |

## 4. Implement fields

| API | Notes |
|-----|-------|
| list / add | Beneficiary accounts |
| uploaddocument | Response codes table in PDF |
| accountstatus | Gate before txn |
| dotransaction | Debit wallet |
| status | Poll + callback |


## 5. Flows

1. `payout/list` — existing accounts
2. `payout/add` — add beneficiary account
3. `uploaddocument` — KYC docs if required
4. `accountstatus` — wait until approved
5. `dotransaction` — send money
6. `status` — enquire
7. Handle [`CALLBACKS`](CALLBACKS.md) payout webhook


## 6. Gotchas

- Path casing: `Payout/accountstatus` vs `payout/payout/*` — keep exact
- ≠ InstantPay Payouts headers/paths

## 7. Provider checklist

- [x] 6 payout APIs captured
- [ ] Doc upload MIME/size limits
- [ ] Fee schedule

## Source

[`PAYOUT.md`](PAYOUT.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

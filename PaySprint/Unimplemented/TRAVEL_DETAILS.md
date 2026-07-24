# PaySprint — Travel — Implementation Details

> Compact cheat-sheet. Full: [`TRAVEL.md`](TRAVEL.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

Train + Flight booking via PaySprint merchant + URL generate.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | merchant-status-check | `POST /travel/merchant/status_check` | 📄 |
| 2 | merchant-registration | `POST /travel/merchant/register` | 📄 |
| 3 | generate-url-4 | `POST /travel/railway/url/generate` | 📄 |
| 4 | merchant-registeration | `POST /travel/air/merchant/register` | 📄 |
| 5 | status-check | `POST /travel/air/merchant/status_check` | 📄 |
| 6 | generate-url-9 | `POST /travel/air/url/generate` | 📄 |

## 4. Implement fields

Onboard travel merchant before URL generate. Flight has separate register/status/generate.

## 5. Flows

1. Merchant `register` + `status_check` (rail and/or air)
2. `url/generate` → hosted booking
3. Handle debit/status/cancel (train) and flight callbacks


## 6. Gotchas

- Typo Merchant Registeration
- Debit/status pages may be callback-ish JSON only
- Not InstantPay

## 7. Provider checklist

- [x] Travel APIs captured
- [ ] Train vs flight product priority
- [ ] Callback URLs

## Source

[`TRAVEL.md`](TRAVEL.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

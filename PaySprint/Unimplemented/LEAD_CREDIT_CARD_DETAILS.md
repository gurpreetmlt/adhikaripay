# PaySprint — Lead + Credit Card — Implementation Details

> Compact cheat-sheet. Full: [`LEAD_CREDIT_CARD.md`](LEAD_CREDIT_CARD.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

Lead status + credit card UTM onboarding helpers.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | lead-status-check-api | `POST /lead/generation/status_check` | 📄 |
| 2 | create-credit-card-generate-utm-link-api | `POST /lead/creditcard/get_utm` | 📄 |
| 3 | utm-status-check | `POST /lead/creditcard/status_check` | 📄 |

## 4. Implement fields

UTM flow is partner referral — not card issuing API inside PaySprint.

## 5. Flows

get_utm → user completes journey → status_check.

## 6. Gotchas

- Marketing images heavy in PDF
- External Credilio dependency

## 7. Provider checklist

- [x] Lead/CC APIs captured
- [ ] Commercial terms with PaySprint

## Source

[`LEAD_CREDIT_CARD.md`](LEAD_CREDIT_CARD.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

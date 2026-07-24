# PaySprint — AEPS Bank4 — Implementation Details

> Compact cheat-sheet. Full pages: [`AEPS_BANK4.md`](AEPS_BANK4.md).

> **Location:** `PaySprint/Unimplemented/`
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm (`sit.paysprint.in` / PaySprint-provided; OpenAPI uses `xyz.xyz.in`)
Protocol: REST + JSON + JWT
Status: Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Bank4-specific onboard v2 + AePS v3 transaction APIs.

---

## 2. Auth & headers

| Item | Notes |
|------|-------|
| JWT | `Token` header |
| Authorisedkey | UAT |
| AES | Some AePS/onboard bodies |

```env
PAYSPRINT_PARTNER_ID=
PAYSPRINT_JWT_SECRET=
PAYSPRINT_AES_KEY=
PAYSPRINT_AES_IV=
PAYSPRINT_AUTHORISED_KEY=
PAYSPRINT_MODE=dummy|paysprint_uat|paysprint_live
```

---

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | city-unioun-bank-onboarding | `POST /onboard/v2/onboard/getonboardurl` | 📄 |
| 2 | merchant-onboard-status-check-api-for-bank1-and-bank4 | `POST /onboard/v2/onboard/getonboardstatus` | 📄 |
| 3 | authenticate | `POST /aeps/v3/authenticate/index` | 📄 |
| 4 | balance-enquiry-api | `POST /aeps/v3/balanceenquiry/index` | 📄 |
| 5 | withdrawal-api | `POST /aeps/v3/cashwithdraw/index` | 📄 |
| 6 | ministatement-api | `POST /aeps/v3/ministatement/index` | 📄 |
| 7 | withdrawl-transaction-status-api | `POST /aeps/v3/aepsquery/query` | 📄 |
| 8 | bank-list-1 | `POST /aeps/banklist/index` | 📄 |
| 9 | aadhaar-pay-api | `POST /aeps/v3/aadharpay/index` | 📄 |
| 10 | aadhar-pay-transaction-status-query | `POST /aadharpay/aadharpayquery/query` | 📄 |

---

## 4. Implement fields (high-signal)

Same implement concerns as AEPS — use v3 paths only for Bank4 pipe.

---

## 5. Flows

1. `onboard/v2/onboard/getonboardurl` → merchant completes flow
2. `getonboardstatus`
3. `aeps/v3/authenticate/index` (daily)
4. Balance / Cash withdraw / Ministatement / Aadhaar Pay under `/aeps/v3/...`
5. Status via `aeps/v3/aepsquery/query` (operationId typo: `withdrawl-...`)


---

## 6. Gotchas

- operationId `city-unioun-bank-onboarding` typo (Union)
- Shared banklist endpoint with other pipes

---

## 7. Provider checklist

- [x] Bank4 paths captured
- [ ] Confirm pipe id value
- [ ] Confirm Aadhaar Pay query shared vs v3

---

## Source docs

| Doc | Role |
|-----|------|
| [`AEPS_BANK4.md`](AEPS_BANK4.md) | Full archive |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES |

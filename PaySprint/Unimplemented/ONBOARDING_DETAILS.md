# PaySprint — Onboarding — Implementation Details

> Compact cheat-sheet. Full pages: [`ONBOARDING.md`](ONBOARDING.md).

> **Location:** `PaySprint/Unimplemented/`
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm (`sit.paysprint.in` / PaySprint-provided; OpenAPI uses `xyz.xyz.in`)
Protocol: REST + JSON + JWT
Status: Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Merchant activation / pipe-wise status for PaySprint AePS & related rails.

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
| 1 | onboarding | `POST /onboard/onboardnew/getonboardurl` | 📄 |
| 2 | merchant-activation-api-copy | `POST /onboard/onboard/activate_merchant` | 📄 |
| 3 | onboard-status-check-for-pipe-wise | `POST /onboard/onboard/getonboardstatus` | 📄 |
| 4 | onboard-status-check-dmt-casa | `POST /dmt-casa/merchant/index` | 📄 |
| 5 | send-otp-9 | `POST /aeps/kyc/V3/send_otp` | 📄 |
| 6 | verify-otp-8 | `POST /aeps/kyc/V3/verify_otp` | 📄 |
| 7 | merchant-pan-update | `POST /onboard/onboard/pan_update_bank6` | 📄 |

---

## 4. Implement fields (high-signal)

| API | Key fields |
|-----|------------|
| getonboardurl | `merchantcode`, location, `pipe`, `accessmode` |
| activate_merchant | `aadhaar`, `piddata`, `dob`, `pipe`, income / nature_of_bussiness (typo in docs) |
| getonboardstatus | `merchantcode`, `mobile`, `pipe` → `is_casa` etc. |
| send/verify OTP | KYC V3 |
| pan_update_bank6 | `merchantcode`, `name`, `pan`, `dob` |


---

## 5. Flows

1. `getonboardurl` / `getonboardurl` v2 → open `redirecturl` for merchant
2. Complete UI / SDK steps (Aadhaar, docs)
3. `activate_merchant` with `piddata` + demographics when required
4. Poll `getonboardstatus` with `merchantcode`, `mobile`, `pipe`
5. Bank1 may need separate eKYC OTP flow (`aeps/kyc/V3/*` or Bank1 merchantkyc)
6. Optional `pan_update_bank6`


---

## 6. Gotchas

- operationId `merchant-activation-api-copy` is pollution
- `nature_of_bussiness` typo — confirm live key
- Separate Bank4 onboard under `/onboard/v2/...` (see AEPS_BANK4)

---

## 7. Provider checklist

- [x] Core onboard APIs captured
- [ ] Pipe enum list from PaySprint
- [ ] SDK vs web URL decision
- [ ] Encryption required flags per pipe

---

## Source docs

| Doc | Role |
|-----|------|
| [`ONBOARDING.md`](ONBOARDING.md) | Full archive |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES |

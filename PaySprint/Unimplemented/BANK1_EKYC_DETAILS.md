# PaySprint — Bank1 eKYC + AePS — Implementation Details

> Compact cheat-sheet. Full pages: [`BANK1_EKYC.md`](BANK1_EKYC.md).

> **Location:** `PaySprint/Unimplemented/`
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm (`sit.paysprint.in` / PaySprint-provided; OpenAPI uses `xyz.xyz.in`)
Protocol: REST + JSON + JWT
Status: Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Bank1 pipe: dual eKYC + bank1-suffixed AePS v3 APIs.

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
| 1 | aeps-bank-1-merchant-ekyc-sendotp | `POST /aeps/v3/merchantkyc/send_otp` | 📄 |
| 2 | re-send-otp | `POST /aeps/v3/merchantkyc/resend_otp` | 📄 |
| 3 | verify-otp-7 | `POST /aeps/v3/merchantkyc/verify_otp` | 📄 |
| 4 | authenticate-1 | `POST /aeps/v3/authenticate/bank1` | 📄 |
| 5 | balance-enquiry-2 | `POST /aeps/v3/balanceenquiry/bank1` | 📄 |
| 6 | mini-statement-1 | `POST /aeps/v3/ministatement/bank1` | 📄 |
| 7 | cash-withdrawal | `POST /aeps/v3/cashwithdraw/bank1` | 📄 |
| 8 | aeps-bank-1-cashwithdrawal-transaction-status-check-api | `POST /aeps/v3/aepsquery/bank1` | 📄 |

---

## 4. Implement fields (high-signal)

| Step | Fields |
|------|--------|
| send_otp | `merchantcode`, `aadhaar`, `latitude`, `longitude`, `accessmode` |
| verify_otp | `otp`, `stateresp`, `ekyc_id`, `piddata` |
| txn | RAW_BODY biometric payloads on `/aeps/v3/*/bank1` |


---

## 5. Flows

1. `merchantkyc/send_otp` with Aadhaar + lat/long
2. Optional `resend_otp`
3. `verify_otp` with otp + stateresp + ekyc_id + piddata
4. Repeat eKYC if provider requires second pass
5. `authenticate/bank1` then txn APIs `*/bank1`


---

## 6. Gotchas

- Header pollution: `authorizedkey` vs `Authorisedkey`
- Double eKYC requirement is easy to miss
- User-Agent appears in some OpenAPI headers — confirm if mandatory

---

## 7. Provider checklist

- [x] Bank1 APIs captured
- [ ] Confirm double-eKYC sequence with PaySprint
- [ ] Header casing

---

## Source docs

| Doc | Role |
|-----|------|
| [`BANK1_EKYC.md`](BANK1_EKYC.md) | Full archive |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES |

# PaySprint — AEPS — Implementation Details

> Compact cheat-sheet. Full pages: [`AEPS.md`](AEPS.md).

> **Location:** `PaySprint/Unimplemented/`
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm (`sit.paysprint.in` / PaySprint-provided; OpenAPI uses `xyz.xyz.in`)
Protocol: REST + JSON + JWT
Status: Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Aadhaar Enabled Payment System — multi-bank pipes on PaySprint.

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
| 1 | aeps-two-factor-authentication-register | `POST /aeps/kyc/Twofactorkyc/registration` | 📄 |
| 2 | aeps-two-factor-authentication-authenticate | `POST /aeps/kyc/Twofactorkyc/authentication` | 📄 |
| 3 | aeps-two-factor-authentication-bank-3-registartion | `POST /aeps/kyc/Twofactorkyc/register_agent` | 📄 |
| 4 | aeps-two-factor-authentication-bank-3-authenticate | `POST /aeps/kyc/Twofactorkyc/auth_login` | 📄 |
| 5 | aeps-two-factor-authentication-bank-5-api | `POST /aeps/kyc/v5/authentication` | 📄 |
| 6 | authentication-2 | `POST /aeps/kyc/v6/authentication` | 📄 |
| 7 | enquiry | `POST /aeps/balanceenquiry/index` | 📄 |
| 8 | aeps-transaction-initiate-otp-api | `POST /aeps/txnotp/index` | 📄 |
| 9 | aeps-cashwithdraw-transaction-with-merchant-authencity- | `POST /aeps/authcashwithdraw/index` | 📄 |
| 10 | mini-statement | `POST /aeps/ministatement/index` | 📄 |
| 11 | bank-list-1 | `POST /aeps/banklist/index` | 📄 |
| 12 | cash-withdraw-transaction-status-query-1 | `POST /aeps/aepsquery/query` | 📄 |
| 13 | aadhar-pay-1 | `POST /aadharpay/aadharpay/index` | 📄 |
| 14 | aadhar-pay-transaction-status-query | `POST /aadharpay/aadharpayquery/query` | 📄 |
| 15 | aeps-merchant-base-location-update-api | `POST /onboard/onboard/update_location` | 📄 |

---

## 4. Implement fields (high-signal)

| Concern | Notes |
|---------|-------|
| 2FA | Register once; authenticate per calendar day (NPCI-style rule also in NSDL PDF) |
| Body | Often `RAW_BODY` / AES — capture live decrypted field list with PaySprint |
| Timeout | 180s |
| Query | Mandatory for pending CW / Aadhaar Pay |
| Location | `update_location` with lat/long |


---

## 5. Flows

### Daily 2FA then txn

1. Bank-specific **Registration** (once) → **Authentication** / auth_login (daily)
2. `banklist/index` for IIN/bank master
3. Balance / Ministatement / Cash withdraw / Aadhaar Pay with biometric `piddata` (often AES-encrypted body)
4. On withdraw: may need `txnotp` then `authcashwithdraw`
5. Always support `aepsquery/query` / aadharpay query for pending

### Bank pipe variants

- Twofactorkyc/* = Bank2/3 style
- kyc/v5, v6 = Bank5/6 auth variants
- Bank4 uses `/aeps/v3/*` — see [`AEPS_BANK4.md`](AEPS_BANK4.md)
- Bank1 uses `/aeps/v3/*/bank1` + merchant eKYC — see [`BANK1_EKYC.md`](BANK1_EKYC.md)


---

## 6. Gotchas

- Do not conflate with InstantPay AePS
- Typo pages: Withdrawl / Wihdraw
- Keep RD services updated
- Never store fingerprint templates

---

## 7. Provider checklist

- [x] Core AePS + Aadhaar Pay paths
- [ ] Decrypt sample body field list
- [ ] Pipe→endpoint map from PaySprint
- [ ] Device/RD certification

---

## Source docs

| Doc | Role |
|-----|------|
| [`AEPS.md`](AEPS.md) | Full archive |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES |

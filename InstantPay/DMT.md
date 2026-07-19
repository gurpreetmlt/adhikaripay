# InstantPay — Remittance / DMT Implementation (Money Transfer)

> Ek jagah full picture: Domestic Money Transfer (DMT) InstantPay pe kaise banega, kya done hai, kya pending hai, aur provider se kya-kya chahiye. Onboarding pehle zaroori hai: [`ONBOARDING.md`](ONBOARDING.md). AEPS rails: [`AEPS.md`](AEPS.md).

**Provider:** InstantPay (Remittance — Domestic)
**Status:** 🚧 Planning / in-progress. Bank list InstantPay pe wired. Remitter/beneficiary/transfer abhi stubs. Ye doc har API implement hote hi update hoga.
**Last updated:** 2026-07-19

### Service overview (InstantPay)
BC (Business Correspondent) agent-assisted domestic money transfer, physical outlet pe. **Modes: IMPS & NEFT.** **RBI BC guidelines applicable.**

**Limits (hard — enforce karna hai):**
| Limit | Value |
|-------|-------|
| Per transaction | ₹5,000 |
| Per month, per remitter | ₹25,000 |

---

## 1. Architecture (ek line me)

Wahi provider-adapter pattern jo AEPS/onboarding me hai. `AEPS_PROVIDER_MODE` env se dummy (mock) vs InstantPay decide hota hai. Remitter registration → beneficiary → transaction, sab ek hi REST contract ke peeche. **Fail-closed** — sandbox/live me creds missing to startup pe fail.

```
Retailer (mobile/web)
      │  same REST contract
      ▼
Backend  /api/txn/dmt/*  (txn.controller → provider.router)
      │  AEPS_PROVIDER_MODE ──►  mock  |  instantpay
      ▼
ProviderAdapter  (dmt* methods)
      ▼
InstantPay HTTP  (/fi/remitter/*, /fi/beneficiary/*, /fi/transaction/*)   ← sandbox/live me
```

### Modes — AEPS ke saath shared
| Mode | Behaviour | Kab use |
|------|-----------|---------|
| `dummy` | Mock success/pending, koi InstantPay call nahi | Testing |
| `instantpay_sandbox` | Real InstantPay (sandbox creds) | UAT |
| `instantpay_live` | Real InstantPay (prod creds) | Production |

---

## 2. Remittance flow (InstantPay official)

```
1. Merchant onboarded              (see ONBOARDING.md — bio-KYC spKey=DMI approved)
      ▼
2. Remitter Profile                exist check + registered beneficiaries fetch
      ▼  (agar registered nahi)
3. Remitter Registration           → OTP mobile pe
      ▼
4. Remitter Registration Verify    OTP validate
      ▼
5. Remitter Biometric/Face KYC     (registration ke baad)
      ▼
6. Beneficiary Add (OTP verify)    ya already-registered beneficiary select
      ▼
7. Generate Transaction OTP / Bio Auth   (transfer se pehle)
      ▼
8. Transaction (IMPS / NEFT)
      ▼
9. Transaction Status              (pending/timeout pe — /reports/txnStatus)
```

---

## 3. Service-wise status

Har API implement hote hi ye table + niche details bharni hai. Backend endpoints **proposed** hain (implement pe confirm).

| # | Service | Backend endpoint (proposed) | InstantPay endpoint | Status |
|---|---------|------------------------------|---------------------|--------|
| 0 | Bank Details | `GET /api/txn/dmt/banks` | `POST /fi/remit/out/domestic/v2/banks` | ✅ Done |
| 1 | Remitter Profile | `POST /api/txn/dmt/remitter/profile` | `POST /fi/remit/out/domestic/v2/remitterProfile` | ✅ Done |
| 2 | Remitter Registration | `POST /api/txn/dmt/remitter/register` | `POST /fi/remit/out/domestic/v2/remitterRegistration` | ✅ Done |
| 3 | Remitter Reg. Verify (OTP) | `POST /api/txn/dmt/remitter/register/verify` | `POST /fi/remit/out/domestic/v2/remitterRegistrationVerify` | ✅ Done |
| 4 | Remitter Biometric/Face KYC | `POST /api/txn/dmt/remitter/kyc` | `POST /fi/remit/out/domestic/v2/remitterKyc` | ✅ Done |
| 5 | Beneficiary Add | `POST /api/txn/dmt/beneficiary` | `POST /fi/remit/out/domestic/v2/beneficiaryRegistration` | ✅ Done |
| 6 | Beneficiary Add Verify (OTP) | `POST /api/txn/dmt/beneficiary/verify` | `POST /fi/remit/out/domestic/v2/beneficiaryRegistrationVerify` | ✅ Done |
| 6b | Beneficiary Delete | `POST /api/txn/dmt/beneficiary/delete` | `POST /fi/remit/out/domestic/v2/beneficiaryDelete` | ✅ Done |
| 6c | Beneficiary Delete Verify (OTP) | `POST /api/txn/dmt/beneficiary/delete/verify` | `POST /fi/remit/out/domestic/v2/beneficiaryDeleteVerify` | ✅ Done |
| 7 | Beneficiary List | `GET /api/txn/dmt/beneficiaries` | _TBD_ | ⬜ Pending |
| 8 | Transaction OTP | `POST /api/txn/dmt/transfer/otp` | `POST /fi/remit/out/domestic/v2/generateTransactionOtp` | ✅ Done |
| 9 | Transaction (IMPS/NEFT) | `POST /api/txn/dmt/transfer` | `POST /fi/remit/out/domestic/v2/transaction` | ✅ Done |
| 10 | Transaction Status | `POST /api/txn/:txnRef/recheck` | `POST /reports/txnStatus` | ✅ Shared (already wired) |
| 11 | Transaction Refund OTP | `POST /api/txn/dmt/refund/otp` | `POST /fi/remit/out/domestic/v2/transactionRefundOtp` | ✅ Done |
| 12 | Transaction Refund | `POST /api/txn/dmt/refund` | `POST /fi/remit/out/domestic/v2/transactionRefund` | ✅ Done |

> Transaction Status already AEPS ke saath wired hai (`/reports/txnStatus`, client-level). DMT ke liye `source` param AEPS-only hai — non-AEPS pe nahi bhejenge (adapter already handle karta hai).

### Details per service
_(Har API ka doc paste hote hi yahan bharo: request params, response fields, status codes, edge cases.)_

**0. Bank Details** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/banks` (empty body). Headers: Auth-Code, Client-Id/Secret, **Outlet-Id**, Endpoint-Ip.
- Backend: `GET /api/txn/dmt/banks` → `{ banks: DmtBank[] }` (`bankId`, `name`, `ifscAlias`, `ifscGlobal`, `neftEnabled`, `impsEnabled`, `upiEnabled`, failure rates).
- InstantPay note: sync **at most once/hour** (client/cache side — no DB table yet).
- Service gate skipped (`dmt_bank_list`); routed via `AEPS_PROVIDER_MODE` like other AEPS-family ops.
- Dummy mode: small mock bank set (SBI/HDFC/ICICI/Axis/PNB/BoB).

**1. Remitter Profile** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/remitterProfile`. Body: `mobileNumber` (M), `txnMode`=`ALL`, `iftEnable`=`YES`. Headers: Auth-Code, Client-Id/Secret, Outlet-Id, Endpoint-Ip.
- Backend: `POST /api/txn/dmt/remitter/profile` `{ customerMobile }` → `{ profile: DmtRemitterProfile | null }`.
- Profile fields: name/city/pin, limits (₹5k/txn, ₹25k monthly), `beneficiaries[]`, OTP/bio/IMPS/NEFT flags, `referenceKey` + `validity` + `pidOptionWadh`.
- `profile: null` = remitter not registered (start registration). Service gate skipped (`dmt_remitter_profile`).
- Dummy: registered profile + 1 beneficiary; mobile ending `0000` → `profile: null`.

**2. Remitter Registration** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/remitterRegistration`. Body: `mobileNumber` (M), `encryptedAadhaar` (aes-256-cbc), `referenceKey` (Remitter Profile response se). Headers: Auth-Code, Client-Id/Secret, Outlet-Id, Endpoint-Ip.
- Backend: `POST /api/txn/dmt/remitter/register` `{ customerMobile, aadhaarNumber, referenceKey }` → `{ otpReference }`. Aadhaar plain aata hai, adapter encrypt karta hai (`encryptInstantPayAadhaar`) — Aadhaar provider_logs context mein nahi jaata.
- Success = `statuscode: "OTP"` (OTP remitter mobile pe gaya). `data.otpReference` ko Reg. Verify (step 3) mein OTP ke saath bhejna hai.
- Service gate skipped (`dmt_remitter_register`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success + `MOCK-OTPREF-…` reference.

**3. Remitter Registration Verify** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/remitterRegistrationVerify`. Body: `mobileNumber` (M), `otp` (M), `referenceKey` (Remitter Profile response se). Headers: Auth-Code, Client-Id/Secret, Outlet-Id, Endpoint-Ip.
- Backend: `POST /api/txn/dmt/remitter/register/verify` `{ customerMobile, otp, referenceKey }` → `{ referenceId }`. OTP provider_logs context mein nahi jaata (sirf mobile).
- Success = `statuscode: "TXN"` ("Transaction Successful") — remitter registered. `data.referenceID` provider ka registration reference hai.
- Service gate skipped (`dmt_remitter_register_verify`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success + `MOCK-REGREF-…` reference.

**4. Remitter Biometric/Face KYC (eKYC)** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/remitterKyc`. Body: `mobileNumber` (M), `referenceKey` (Remitter Profile se), `latitude`/`longitude` (M — agent location), `externalRef` (unique txn id, adapter `RK-…` generate karta hai), `consentTaken: "Y"`, `captureType` (FINGER/FACE, optional), `biometricData` (RD service se: ci, hmac, pidData, ts, dc, mi, dpId, mc, rdsId, rdsVer, **Skey** capital-S, srno). Aadhaar alag field mein nahi jaata — encrypted PID ke andar hota hai.
- Backend: `POST /api/txn/dmt/remitter/kyc` `{ customerMobile, referenceKey, biometricPayload (PidData XML), captureType?, latitude?, longitude? }` → `{ poolReferenceId }`. Lat/long na bhejo to retailer profile ke outlet coords use hote hain (AePS jaisa). Biometric payload provider_logs context mein nahi jaata (sirf mobile).
- Success = `statuscode: "TXN"` — **chargeable hai**: response `data.pool` mein pool debit dikhta hai (sample: ₹10 DR). `data.poolReferenceId` = charge/txn reference; `orderid` bhi wahi.
- Service gate skipped (`dmt_remitter_kyc`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success + `MOCK-KYCREF-…` reference.
**5. Beneficiary Add (Registration)** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/beneficiaryRegistration`. Body: `remitterMobileNumber`, `beneficiaryMobileNumber`, `accountNumber`, `ifsc`, `bankId` (bank list se, optional docs table mein par sample mein hai), `name`.
- Backend: `POST /api/txn/dmt/beneficiary` `{ customerMobile (remitter), name, accountNumber, ifsc, beneficiaryMobile?, bankId? }` → `{ beneficiaryId, referenceKey, validity }`. `beneficiaryMobile` na do to remitter mobile hi jaata hai.
- Success = `statuscode: "OTP"` — OTP **remitter** mobile pe jaata hai; `data.referenceKey` + `data.beneficiaryId` next step (Beneficiary Verify) mein chahiye. `orderid` null (non-txn).
- Service gate skipped (`dmt_add_beneficiary`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success + `BENE-…` id + `MOCK-BENKEY-…` referenceKey.
**6. Beneficiary Add Verify (OTP)** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/beneficiaryRegistrationVerify`. Body: `remitterMobileNumber`, `otp`, `beneficiaryId`, `referenceKey` (dono Beneficiary Add response se).
- Backend: `POST /api/txn/dmt/beneficiary/verify` `{ customerMobile (remitter), otp, beneficiaryId, referenceKey }` → `{ beneficiaryId }`.
- Success = `statuscode: "TXN"` — beneficiary registered. Agar `statuscode: "OTP"` wapas aaye to OTP resend hua hai (naya `referenceKey`/`validity` `raw.data` mein) — same endpoint dobara call karo naye OTP se. `orderid` null (non-txn).
- Service gate skipped (`dmt_add_beneficiary_verify`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success, wahi `beneficiaryId` echo hota hai.
**6b. Beneficiary Delete** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/beneficiaryDelete`. Body: `remitterMobileNumber`, `beneficiaryId`.
- Backend: `POST /api/txn/dmt/beneficiary/delete` `{ customerMobile (remitter), beneficiaryId }` → `{ beneficiaryId, referenceKey, validity }`.
- Response `statuscode: "OTP"` — delete confirm karne ke liye OTP **remitter** mobile pe jaata hai; `referenceKey` Delete Verify step mein chahiye. `orderid` null (non-txn).
- Service gate skipped (`dmt_delete_beneficiary`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success, wahi `beneficiaryId` + `MOCK-BENDELKEY-…` referenceKey.
**6c. Beneficiary Delete Verify** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/beneficiaryDeleteVerify`. Body: `remitterMobileNumber`, `beneficiaryId`, `otp`, `referenceKey` (Delete step se).
- Backend: `POST /api/txn/dmt/beneficiary/delete/verify` `{ customerMobile (remitter), otp, beneficiaryId, referenceKey }` → `{ beneficiaryId }`. Request shape Add Verify jaisi — same `dmtBeneficiaryVerifySchema` / `DmtBeneficiaryVerifyParams` reuse.
- Success = `statuscode: "TXN"` — beneficiary deleted. `orderid` null (non-txn).
- Service gate skipped (`dmt_delete_beneficiary_verify`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success, wahi `beneficiaryId` echo hota hai.
**7. Beneficiary List** — _pending_
**8. Transaction OTP** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/generateTransactionOtp`. Body: `remitterMobileNumber`, `amount`, `referenceKey` (Remitter Profile wala).
- Backend: `POST /api/txn/dmt/transfer/otp` `{ customerMobile (remitter), amount, referenceKey }` → `{ referenceKey, validity }`.
- Response `statuscode: "OTP"` — OTP **remitter** mobile pe jaata hai; response ka **naya** `referenceKey` Transfer (step 9) call mein use hoga. `orderid` null (non-txn).
- Service gate skipped (`dmt_txn_otp`); routed via `AEPS_PROVIDER_MODE`. Wallet debit nahi hota (OTP-only step).
- Dummy: hamesha success, `MOCK-TXNOTPKEY-…` referenceKey + 15-min validity.
**9. Transaction (IMPS/NEFT)** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/transaction`. Body: `remitterMobileNumber`, `accountNumber`, `ifsc`, `transferMode` (IMPS/NEFT), `transferAmount`, `latitude`, `longitude`, `referenceKey` (Transaction OTP wala), `otp`, `externalRef`.
- Backend: `POST /api/txn/dmt/transfer` `{ customerMobile (remitter), accountNumber, ifsc, amount, mode (imps|neft), otp, referenceKey, txnPin/txnAuth, idempotencyKey, beneficiaryId? (record only), latitude?/longitude? }`.
- **Money-moving txn** — `executeServiceTxn` (service code `dmt`, service gate ON): main wallet se debit hold → provider call → success commit / fail auto-reversal / TUP pending. `walletTxnLimiter` + agent-auth fresh + txn PIN required.
- `externalRef` = hamara `txnRef` — pending/timeout pe `/reports/txnStatus` recheck isi se hota hai (`POST /api/txn/:txnRef/recheck`). No-response/timeout = **pending** treat karo, status API se confirm.
- Lat/long: body se, warna retailer outlet ke stored coords (`resolveOutletContext`).
- Response data: `txnReferenceId` (RRN), `poolReferenceId` (= `orderid`), `beneficiaryName`, pool balances raw mein. `statuscode: "TXN"` = success, `TUP` = pending.
- `actcode: OTPGENREF` = invalid OTP se declined → poora flow dobara (naya Transaction OTP se).
- Dummy: hamesha success, `MOCK-RRN-…` txnReferenceId.
**10. Transaction Status** — shared with AEPS (see [`AEPS.md`](AEPS.md) §Recheck).
**11. Transaction Refund OTP** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/transactionRefundOtp`. Body: `ipayId` (InstantPay orderid jo refund hona hai).
- Backend: `POST /api/txn/dmt/refund/otp` `{ ipayId }` → `{ referenceKey, validity }`.
- **Kab call karna:** sirf jab remittance txn **pending** ho aur statement/status-check response ke `optional7` mein **ReversalAuthorisationRequired** aaye. Tab ye OTP remitter mobile pe jaata hai; `referenceKey` refund-confirm (step 12) mein lagega.
- Response `statuscode: "OTP"` = "OTP Successfully sent". `orderid` null (non-txn). Service gate skipped (`dmt_refund_otp`); routed via `AEPS_PROVIDER_MODE`. Wallet move nahi hota (OTP-only step).
- Dummy: hamesha success, `MOCK-REFUNDOTPKEY-…` referenceKey + 15-min validity.
**12. Transaction Refund** — ✅ Done
- InstantPay: `POST /fi/remit/out/domestic/v2/transactionRefund`. Body: `ipayId`, `referenceKey` (Refund OTP wala), `otp` (remitter mobile pe aaya).
- Backend: `POST /api/txn/dmt/refund` `{ ipayId, referenceKey, otp }`.
- **Provider-side reversal only** — hamare ledger mein wallet credit isse nahi hota. Refund success ke baad client `POST /api/txn/:txnRef/recheck` chalaye; txnStatus refunded/failed dikhayega aur auto-reversal se retailer wallet credit hoga.
- Service gate skipped (`dmt_refund`); routed via `AEPS_PROVIDER_MODE`.
- Dummy: hamesha success.

---

## 4. Wallet & accounting (plan)

- **Transfer = `direction: debit`** — retailer wallet se paisa nikalta hai (beneficiary bank credit ke liye). Provider fail → auto-reversal (AEPS deposit jaisa pattern).
- **`externalRef` = humara `txnRef`** — recheck deterministic (AEPS jaisa).
- **Charges/commission** — IMPS/NEFT slab-wise; InstantPay se structure confirm karna (see §6).
- **Limits (confirmed by InstantPay):** ₹5,000 / transaction, ₹25,000 / month / remitter. RBI BC guidelines applicable. Backend me pre-transfer enforce karna (per-txn cap + running monthly total per remitter).

---

## 5. Environment variables

AEPS ke saath **shared** — koi naya env expected (confirm on implementation). Reference: `INSTANTPAY_CLIENT_ID/SECRET/AES_KEY/AUTH_CODE`, `AEPS_PROVIDER_MODE`.

---

## 6. API provider (InstantPay) se kya chahiye

### Docs chahiye (har API ka request/response)
- [x] Remitter Profile (`/fi/remit/out/domestic/v2/remitterProfile`) — wired
- [x] Remitter Registration (`/fi/remit/out/domestic/v2/remitterRegistration`) — wired
- [x] Remitter Registration Verify (`/fi/remit/out/domestic/v2/remitterRegistrationVerify`) — wired
- [x] Remitter Biometric/Face KYC (`/fi/remit/out/domestic/v2/remitterKyc`) — wired
- [x] Beneficiary Add (`/fi/remit/out/domestic/v2/beneficiaryRegistration`) — wired
- [x] Beneficiary Verify (`/fi/remit/out/domestic/v2/beneficiaryRegistrationVerify`) — wired
- [x] Beneficiary Delete (`/fi/remit/out/domestic/v2/beneficiaryDelete`) — wired
- [x] Beneficiary Delete Verify (`/fi/remit/out/domestic/v2/beneficiaryDeleteVerify`) — wired
- [ ] Beneficiary List
- [x] Generate Transaction OTP (`/fi/remit/out/domestic/v2/generateTransactionOtp`) — wired
- [x] Transaction (IMPS/NEFT) (`/fi/remit/out/domestic/v2/transaction`) — wired
- [x] Bank Details (`/fi/remit/out/domestic/v2/banks`) — wired
- [x] Transaction Refund OTP (`/fi/remit/out/domestic/v2/transactionRefundOtp`) — wired
- [x] Transaction Refund (`/fi/remit/out/domestic/v2/transactionRefund`) — wired
- [ ] Name-verify / penny-drop (agar InstantPay pe hai)

### Clarifications
- [ ] Remitter monthly limit + KYC upgrade (min-KYC vs full) rules
- [ ] IMPS vs NEFT charges + commission/settlement structure
- [x] Refund/reversal flow — pending txn + `optional7: ReversalAuthorisationRequired` → Refund OTP → Refund (steps 11–12)
- [ ] Beneficiary verification (penny-drop / name match) available?
- [ ] Webhooks/callbacks async confirmation ke liye?
- [ ] `spKey` DMT ke liye `DMI` (onboarding bio-KYC me confirm hua)

---

## 7. Pending (next chats)

- [ ] Har remittance API implement (table §3 order me)
- [ ] DB: remitter + beneficiary tables (InstantPay refs cache)
- [x] DMT UI (agent web) — remitter search/register → beneficiary → transfer (+ refund)
- [ ] DMT UI (mobile) — same flow on Android
- [x] Provider routing: `dmt_bank_list` + `dmt_remitter_profile` `AEPS_PROVIDER_MODE` follow karte hain
- [ ] Compliance: per-remitter limit enforcement, duplicate-transfer guard

---

## 8. Key files (jaha code aayega)

| Area | Path |
|------|------|
| Adapter contract/types | `apps/backend/src/modules/providers/types.ts` (`dmt*` methods) |
| InstantPay adapter | `apps/backend/src/modules/providers/adapters/instantpay.adapter.ts` (`dmtBankList` + `dmtRemitterProfile` live; transfer still 501) |
| Mock adapter | `apps/backend/src/modules/providers/adapters/mock.base.ts` |
| Txn controller/routes | `apps/backend/src/modules/transactions/txn.controller.ts`, `txn.routes.ts` |
| Txn validators | `apps/backend/src/modules/transactions/txn.validators.ts` (`dmt*Schema`) |
| Mode routing | `apps/backend/src/modules/providers/aepsMode.ts`, `provider.router.ts` |
| InstantPay HTTP client | `apps/backend/src/modules/providers/instantpay/client.ts` |
| Task tracker | `docs/TASKS/10-retailer-dmt.md`, `docs/TASKS/21-instantpay-adapter.md` |

---

## 9. Testing (dummy mode) cheat-sheet

- `AEPS_PROVIDER_MODE=dummy` + `ALLOW_STUB_PROVIDERS=true`, retailer token.
- Bank list:
```bash
curl -s -H "Authorization: Bearer <retailer_jwt>" \
  http://localhost:4000/api/txn/dmt/banks
```
- Remitter profile (registered mock; use `…0000` for `profile: null`):
```bash
curl -s -X POST -H "Authorization: Bearer <retailer_jwt>" -H "Content-Type: application/json" \
  -d '{"customerMobile":"9876543210"}' \
  http://localhost:4000/api/txn/dmt/remitter/profile
```
- Mock amount decimals (jab transfer wire ho): `*.99` fail, `*.98` pending/timeout, baaki success.

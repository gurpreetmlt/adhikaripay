# InstantPay — Banking — Implementation Details

> Compact cheat-sheet. Full pages: [`BANKING.md`](BANKING.md). Auth: [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md).

> **Location:** `InstantPay/Unimplemented/` — implement hone pe root me AEPS-style `BANKING.md` banega.
> **Workflow:** har nayi Banking page → full + ye DETAILS dono update.

**Base docs URL:** https://developers.instantpay.in/reference/banking-overview
**API host:** `https://api.instantpay.in`
**Status:** 📄 Docs only
**Last updated:** 2026-07-20

---

## 1. What it is (for product / implement)

| Item | Value |
|------|-------|
| Product | Connected Banking — Virtual Bank Accounts + **wallet / account statements** |
| Collections | VBA — IMPS / NEFT / RTGS, real-time settlement (overview) |
| Statements | `POST /reports/statement` — Business Wallet (`bankProfileId: "0"`) + linked banks (other profiles) |

---

## 2. Shared auth (statement + banking)

| Header | Notes |
|--------|-------|
| `X-Ipay-Auth-Code` | `"1"` |
| `X-Ipay-Client-Id` / `X-Ipay-Client-Secret` | InstantPay |
| `X-Ipay-Endpoint-Ip` | End-customer IP — **partner-supplied (N)** |

JWT alt: [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md).

---

## 3. Page / API matrix

| # | Page | Endpoint | Status |
|---|------|----------|--------|
| 0 | Overview — VBA collections | — (concept) | 📄 |
| 1 | Account Statement — Business Wallet | `POST /reports/statement` (`bankProfileId: "0"`) | 📄 |
| 2 | Account Statement — Collect Orders | `POST /reports/statement` (`bankProfileId: "0"`, `isOrder: true`) | 📄 |
| 3 | Account Statement — Bank Accounts | `POST /reports/statement` (non-zero `bankProfileId` + `externalRef`) | 📄 |
| 4 | Balance Check — Business Wallet | `POST /accounts/balance` (`bankProfileId: "0"`) | 📄 |
| 5 | Balance Check — Bank Account | `POST /accounts/balance` (non-zero profile; **chargeable**) | 📄 |
| 6 | Contact Book — Overview | CRUD + tags | 📄 |
| 7 | Contact Book — Add Tag | `POST /contacts/tag` | 📄 |
| 8 | Contact Book — Update Tag | `PATCH /contacts/tag` | 📄 |
| 9 | Contact Book — Delete Tag | `DELETE /contacts/tag` | 📄 |
| 10 | Contact Book — List Tag | `GET /contacts/tag` | 📄 |
| 11 | Contact Book — Add Contact | `POST /contacts/profile` | 📄 |
| 12 | Contact Book — Update Contact | `PATCH /contacts/profile` | 📄 |
| 13 | Contact Book — Delete Contact | `DELETE /contacts/profile` | 📄 |
| 14 | Contact Book — List Contact | `GET /contacts/profile` | 📄 |
| 15 | Contact Book — Add Address | `POST /contacts/address` | 📄 |
| 16 | Contact Book — Update Address | `PATCH /contacts/address` | 📄 |
| 17 | Contact Book — List Address | `GET /contacts/address` | 📄 |
| 18 | Contact Book — Delete Address | `DELETE /contacts/address` | 📄 |
| 19 | Contact Book — Add Payment Details | `POST /contacts/payment` | 📄 |
| 20 | Contact Book — Set Primary Payment | `POST /contacts/payment/primary` | 📄 |
| 21 | Contact Book — Delete Payment Details | `DELETE /contacts/payment` | 📄 |
| 22 | Contact Book — Verify Payment | `POST /contacts/payment/verify` | 📄 |
| 23 | Contact Book — Add Note | `POST /contacts/note` | 📄 |
| 24 | Contact Book — Update Note | `PATCH /contacts/note/update` | 📄 |
| 25 | Contact Book — Delete Note | `DELETE /contacts/note` | 📄 |
| 26 | Contact Book — List Notes | `GET /contacts/note` | 📄 |
| 27 | Contact Book — Add Business | `POST /contacts/business` | 📄 |
| 28 | Contact Book — Update Business | `PATCH /contacts/business` | 📄 |
| 29 | Contact Book — List Business | `GET /contacts/business` | 📄 |
| 30 | Contact Book — Add Person | `POST /contacts/person` | 📄 |
| 31 | Contact Book — Update Person | `PATCH /contacts/person` | 📄 |
| 32 | Contact Book — List Person | `GET /contacts/person` | 📄 |
| 33 | Contact Book — Delete Person | `DELETE /contacts/person` | 📄 |
| 34 | UPI ATM — Overview | — (concept + flow; QR + status APIs TBD) | 📄 |
| 35 | UPI ATM — Generate QR | `POST /fi/uatm/generateQr` | 📄 |
| 36 | UPI ATM — QR Status | `POST /fi/uatm/qrStatus` | 📄 |

---

## 4. Business Wallet statement — implement fields

**URL:** `POST https://api.instantpay.in/reports/statement`

### Request

```
bankProfileId: "0"          # FIXED for Business Wallet
accountNumber: string       # wallet account number
pagination: { pageNumber, recordsPerPage }
filters: { txnDateFrom: YYYY-MM-DD, txnDateTo: YYYY-MM-DD }
```

### Response (use this shape for wallet)

```
data.meta: { totalPages, currentPage, totalRecords, recordsOnCurrentPage, recordFrom, recordTo }
data.records[]: {
  status, txnDateTime,
  ipayOrderId, clientOrderId, transactionId, reversalIpayOrderId,
  productCode, productName, subProductCode, subProductName,
  txnMode,                          # DR | CR
  txnChargedValue, orderValue, convenienceFee, txnSurcharge, txnCashback, txnTds,
  closingBalance,
  narrationValue0..9,
  responseCode, responseMsg
}
```

Success: `statuscode: "TXN"`. `orderid` often `null`.

---

## 5. Collect Orders statement — implement fields

**Same URL.** Difference: **`isOrder: true`**.

### Request

```
bankProfileId: "0"
accountNumber: string
pagination: { pageNumber, recordsPerPage }
filters: { txnDateFrom, txnDateTo }
isOrder: true                 # REQUIRED — distinguishes Collect Orders from wallet
```

### Response

Same `data.meta` + `data.records[]` as wallet, except records use:

| Field | Notes |
|-------|-------|
| `settlementIpayOrderId` | Instead of wallet’s `reversalIpayOrderId` |
| (no `closingBalance` in sample) | May still appear in live — treat optional |

Other fields: same product / money / narration / responseCode pattern.

---

## 6. Bank Accounts statement — implement fields

**Same URL.** Linked **external bank** statement (not wallet).

### Request

```
bankProfileId: string       # e.g. "10910" — NOT "0"
accountNumber: string
externalRef: string         # REQUIRED — unique alphanumeric; API is CHARGEABLE
pagination: { pageNumber, recordsPerPage }   # samples; table/OpenAPI also mention pageReference
filters: { txnDateFrom, txnDateTo }
```

### Response (bank shape)

```
data.statements: {
  pageReference: string,
  records[]: {
    txnDate, txnId, amount, type,   # CR | DR
    balance, narration1, narration2
  }
}
```

---

## 7. Statement modes cheat-sheet (same endpoint)

| Mode | `bankProfileId` | Extra | Response shape |
|------|-----------------|-------|----------------|
| Business Wallet | `"0"` | — | `data.meta` + `data.records` (product fields, `closingBalance`, `reversalIpayOrderId`) |
| Collect Orders | `"0"` | `isOrder: true` | Same meta/records; `settlementIpayOrderId`; no `closingBalance` in sample |
| Bank Accounts | non-zero profile | `externalRef` (unique alphanumeric) | `data.statements` (`txnDate`, `amount`, `type`, `balance`, …) |

---

## 8. Gotchas

| Issue | Detail |
|-------|--------|
| Same URL, mode flags | See §7 |
| Params table bug | Bank Accounts table says `bankProfileId: 0 (Fixed)` — **wrong**; samples use `10910` |
| Pagination | Samples: `pageNumber`/`recordsPerPage`; table/OpenAPI: `pageReference` |
| Filter keys | Prefer `txnDateFrom`/`txnDateTo`; some samples `fromDate`/`toDate` |
| Chargeable | Bank Accounts statement is **chargeable** |
| `externalRef` | Unique + alphanumeric for bank mode |

---

## 9. Balance Check — Business Wallet

**URL:** `POST https://api.instantpay.in/accounts/balance`

### Request

```
bankProfileId: "0"
accountNumber: string       # InstantPay registered MOBILE number
externalRef: string         # unique alphanumeric
latitude / longitude: string  # 4 decimal places (e.g. "20.1236")
```

### Response

```
data: {
  bankId, bankProfileId, accountNumber, accountShortNumber,
  balance: { total, lien, available },
  poolReferenceId,
  pool: { account, openingBal, mode, amount, closingBal }
}
```

### Rules

- Sync / poll **≤ 1× per hour** (provider note)
- Lat/long: degrees, **4 digits after decimal**

---

## 10. Balance Check — Bank Account

**Same URL:** `POST /accounts/balance` — **chargeable**.

### Request

```
bankProfileId: string       # from InstantPay portal (e.g. "10910") — NOT "0"
accountNumber: string       # linked CURRENT account number
externalRef: string         # unique alphanumeric
latitude / longitude        # 4 decimal places
```

### Response

Same shape as wallet balance (`balance.total/lien/available` + `pool`). Differences:

- Non-zero `bankProfileId`
- `poolReferenceId` often populated
- `pool.amount` reflects **fee** (sample `"0.30"`)
- No `bankId` in sample

### Balance modes cheat-sheet

| Mode | `bankProfileId` | `accountNumber` | Fee | Notes |
|------|-----------------|-----------------|-----|-------|
| Business Wallet | `"0"` | Registered mobile | Sample `0.00` | Poll ≤ 1×/hour |
| Bank Account | Portal profile id | Linked current A/C | **Yes** | Confirm KAM pricing |

---

## 11. Contact Book

| Item | Value |
|------|-------|
| Purpose | Manage customers, vendors, employees — organize / update / interact |
| Features | **CRUD** contacts; **tags** (categorize + filter) |
| Base path | `https://api.instantpay.in/contacts` |
| Headers | Auth-Code / Client-Id / Client-Secret / Endpoint-Ip (IP = partner-supplied) |

### APIs captured

| # | API | Method + path | Request | Response highlights |
|---|-----|---------------|---------|---------------------|
| 7 | Add Tag | `POST /contacts/tag` | `name`, `hexColorCode` | `data._id`, `userId`, timestamps |
| 8 | Update Tag | `PATCH /contacts/tag` | `tagId`, `name`, `hexColorCode` | `data: 1` (success flag) |
| 9 | Delete Tag | `DELETE /contacts/tag` | `tagId` (JSON body) | `data: null` |
| 10 | List Tag | `GET /contacts/tag` | (headers only) | `data[]`: `_id`, `name`, `hexColorCode` |
| 11 | Add Contact | `POST /contacts/profile` | `name`, `email`, `mobile`, `companyName?`, `tagDetails[{tagId}]` | `data._id`, `tagId[]`, `callingCode` |
| 12 | Update Contact | `PATCH /contacts/profile` | `contactId`, `name`, `email`, `mobile`, `tagDetails[{tagId}]` | Updated profile object |
| 13 | Delete Contact | `DELETE /contacts/profile` | `contactId` (JSON body) | `data: null` |
| 14 | List Contact | `GET /contacts/profile` | headers only (see gotcha) | `data[]` + nested `tags[]` |
| 15 | Add Address | `POST /contacts/address` | `gcId`, `addressType`, `address`, `city`, `state`, `pincode`, `countryCode` | `data._id` (address id) |
| 16 | Update Address | `PATCH /contacts/address` | `addressId` + same fields as Add | Address object (`_id`) |
| 17 | List Address | `GET /contacts/address` | `gcId` (JSON body on GET) | `data[]` addresses |
| 18 | Delete Address | `DELETE /contacts/address` | `gcId`, `addressId` (JSON body) | `data: null` |
| 19 | Add Payment Details | `POST /contacts/payment` | `gcId`, `accountType` (`VPA`/`WALLET`/`Account`), type-specific fields; `isVerificationOn` → needs `externalRef`, lat, long | `data._id` (payment method id) |
| 20 | Set Primary Payment | `POST /contacts/payment/primary` | `gcId`, `paymentId` | `data: null` |
| 21 | Delete Payment Details | `DELETE /contacts/payment` | `gcId`, `paymentId` (JSON body) | `data: null` |
| 22 | Verify Payment | `POST /contacts/payment/verify` | `gcId`, `paymentId`, `externalRef`, `latitude`, `longitude` | Verification txn + `pool`/`payer`/`payee` |
| 23 | Add Note | `POST /contacts/note` | multipart: `gcId`, `note`, `files[]` | `data._id` (note id) |
| 24 | Update Note | `PATCH /contacts/note/update` | multipart: `gcId`, `noteId`, `note`; optional `removedFiles[]`, `files[]` | `data`: `gcId`, `note` |
| 25 | Delete Note | `DELETE /contacts/note` | JSON: `gcId`, `noteId` | `data: null` |
| 26 | List Notes | `GET /contacts/note` | `gcId` (JSON body on GET) | `data[]` + `attachment[]` |
| 27 | Add Business | `POST /contacts/business` | `gcId`; optional `pan`, `cin`, `gstin`, `tan`, `udhyam`/`udyam` | `data._id`, `panVerified` |
| 28 | Update Business | `PATCH /contacts/business` | Same fields as Add (keyed by `gcId` only; no `businessId`) | Full fields + `*Verified` flags |
| 29 | List Business | `GET /contacts/business` | `gcId` (JSON body on GET) | `data[]` + `_id` + `*Verified` |
| 30 | Add Person | `POST /contacts/person` | `gcId`, `contactPersonName`, `email`, `mobile`, `description` | `data._id` (person id) + `callingCode` |
| 31 | Update Person | `PATCH /contacts/person` | `personId` + same fields as Add | Lean person object (no `_id`) |
| 32 | List Person | `GET /contacts/person` | `gcId` (JSON body on GET) | `data[]` persons |
| 33 | Delete Person | `DELETE /contacts/person` | `gcId`, `personId` (JSON body) | `data: null` |

### Suggested backend (Contact Book)

```
POST /api/banking/contacts/tags   → InstantPay POST /contacts/tag
```

(More routes as pages paste.)

---

## 12. Suggested Adhikari backend (when implementing)

```
POST /api/banking/statement/business-wallet   → /reports/statement { bankProfileId: "0", … }
POST /api/banking/statement/collect-orders    → /reports/statement { bankProfileId: "0", isOrder: true, … }
POST /api/banking/statement/bank-account      → /reports/statement { bankProfileId, accountNumber, externalRef, … }
POST /api/banking/balance/business-wallet     → /accounts/balance { bankProfileId: "0", … }
POST /api/banking/balance/bank-account        → /accounts/balance { bankProfileId, … }  # chargeable
POST /api/banking/contacts/tags               → /contacts/tag { name, hexColorCode }
PATCH /api/banking/contacts/tags               → /contacts/tag { tagId, name, hexColorCode }
DELETE /api/banking/contacts/tags               → /contacts/tag { tagId }
GET /api/banking/contacts/tags                  → /contacts/tag
POST /api/banking/contacts                      → /contacts/profile { name, email, mobile, companyName?, tagDetails }
PATCH /api/banking/contacts                     → /contacts/profile { contactId, name, email, mobile, tagDetails }
DELETE /api/banking/contacts                    → /contacts/profile { contactId }
GET /api/banking/contacts                       → /contacts/profile
POST /api/banking/contacts/addresses            → /contacts/address { gcId, addressType, address, city, state, pincode, countryCode }
PATCH /api/banking/contacts/addresses           → /contacts/address { addressId, gcId, addressType, address, city, state, pincode, countryCode }
GET /api/banking/contacts/addresses             → /contacts/address { gcId }  # GET + body per provider docs
DELETE /api/banking/contacts/addresses          → /contacts/address { gcId, addressId }
POST /api/banking/contacts/payments             → /contacts/payment { gcId, accountType, … }
POST /api/banking/contacts/payments/primary     → /contacts/payment/primary { gcId, paymentId }
DELETE /api/banking/contacts/payments           → /contacts/payment { gcId, paymentId }
POST /api/banking/contacts/payments/verify      → /contacts/payment/verify { gcId, paymentId, externalRef, latitude, longitude }
POST /api/banking/contacts/notes                → /contacts/note  (multipart: gcId, note, files[])
PATCH /api/banking/contacts/notes               → /contacts/note/update  (multipart: gcId, noteId, note, removedFiles[]?, files[]?)
DELETE /api/banking/contacts/notes              → /contacts/note { gcId, noteId }
GET /api/banking/contacts/notes                 → /contacts/note { gcId }  # GET + body
POST /api/banking/contacts/business             → /contacts/business { gcId, pan?, gstin?, cin?, tan?, udhyam? }
PATCH /api/banking/contacts/business            → /contacts/business { gcId, pan?, gstin?, cin?, tan?, udhyam? }
GET /api/banking/contacts/business              → /contacts/business { gcId }  # GET + body
POST /api/banking/contacts/persons              → /contacts/person { gcId, contactPersonName, email, mobile, description }
PATCH /api/banking/contacts/persons             → /contacts/person { personId, gcId, contactPersonName, email, mobile, description }
GET /api/banking/contacts/persons               → /contacts/person { gcId }  # GET + body
DELETE /api/banking/contacts/persons            → /contacts/person { gcId, personId }
POST /api/banking/upi-atm/qr                    → /fi/uatm/generateQr { latitude, longitude, mobile, amount, externalRef }  # + X-Ipay-Outlet-Id
POST /api/banking/upi-atm/status                → /fi/uatm/qrStatus { ipayId }  # + X-Ipay-Outlet-Id
```

### Tag API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/tag` | Returns `_id` |
| Update | `PATCH /contacts/tag` | `data: 1` |
| Delete | `DELETE /contacts/tag` | Body `tagId`; `data: null` |
| List | `GET /contacts/tag` | No query/body; array of tags |

### Contact API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/profile` | Request `tagDetails[{tagId}]` → response `tagId[]` + contact `_id` |
| Update | `PATCH /contacts/profile` | Requires `contactId`; returns full profile |
| Delete | `DELETE /contacts/profile` | Body `contactId`; `data: null` |
| List | `GET /contacts/profile` | Headers only; `data[]` includes `tags[]` objects |

### Address API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/address` | `gcId` = contact `_id`; returns address `_id` |
| Update | `PATCH /contacts/address` | Requires `addressId` + `gcId`; sample status text may still say “Added” |
| List | `GET /contacts/address` | Body `{ gcId }` on GET (confirm query-param alt on staging) |
| Delete | `DELETE /contacts/address` | Body `{ gcId, addressId }`; `data: null`; param table `AddressId` → JSON `addressId` |

### Payment API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/payment` | `accountType`: `VPA` / `WALLET` / `Account` (`ACCOUNT` in conditionals). VPA→`upiId`; ACCOUNT→`accountNumber`+`accountIfsc`+`beneficiaryName`; WALLET→`phoneNumber`. `isVerificationOn: true` → require `externalRef`, `latitude`, `longitude`; else verify later via Verify Payment API. Response: `_id`, `isPrimary`, `isVerified`; VPA stored in `accountNumber`. |
| Set primary | `POST /contacts/payment/primary` | Body `{ gcId, paymentId }`; `data: null`. OpenAPI server/path and x-readme samples are inconsistent — use curl URL with `/primary`. |
| Delete | `DELETE /contacts/payment` | Body `{ gcId, paymentId }`; `data: null`. Provider http sample wrongly shows Set Primary path — trust curl `DELETE`. |
| Verify | `POST /contacts/payment/verify` | Body `{ gcId, paymentId, externalRef, latitude, longitude }`. Returns penny-drop style `data` (`pool`, `payer`, `payee`, `txnValue`, `orderid`). Status typo: “Verfication”. Likely chargeable — confirm staging. |

### Note API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/note` | **multipart**: `gcId`, `note`, `files[]`. Response `data._id` (no file URLs). Confirm if files can be empty. |
| Update | `PATCH /contacts/note/update` | **multipart**: `gcId`, `noteId`, `note`; optional `removedFiles[]` (file names), `files[]`. Path is `/note/update` (not same as Add). Response lean: `gcId` + `note` only. |
| Delete | `DELETE /contacts/note` | **JSON** body `{ gcId, noteId }`; `data: null`. Ignore bogus `XContent-Type` header in provider samples. |
| List | `GET /contacts/note` | Body `{ gcId }` on GET. `data[]` includes `attachment[{ fileName, fileLink, fileSize }]` — use `fileName` for Update `removedFiles[]`. |

### Business API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/business` | `gcId` + optional `pan`/`cin`/`gstin`/`tan`/`udhyam` (table says `udyam`). Response `_id`, `panVerified`. Status: “DetailsAdded” (no space). |
| Update | `PATCH /contacts/business` | Same body as Add; **no `businessId`** — keyed by `gcId`. Response includes each field + `panVerified`/`cinVerified`/`gstinVerified`/`tanVerified`/`udyamVerified`. Request sample `udhyam` vs response `udyam`. |
| List | `GET /contacts/business` | Body `{ gcId }` on GET. `data[]` with `_id`, all fields, `*Verified`, timestamps. Array shape — confirm multi-row per contact on staging. |

### Person API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Add | `POST /contacts/person` | All mandatory: `gcId`, `contactPersonName`, `email`, `mobile`, `description`. Response `_id` + `callingCode`. Sub-resource of Contact — not the same as `/contacts/profile`. |
| Update | `PATCH /contacts/person` | Requires `personId` + same fields as Add. Response lean (no `_id`). OpenAPI x-readme wrongly shows GET — use PATCH. |
| List | `GET /contacts/person` | Body `{ gcId }` on GET. `data[]` full person objects. OpenAPI `operationId` wrongly `list-address`. |
| Delete | `DELETE /contacts/person` | Body `{ gcId, personId }`; `data: null`. Confirms List Contact doc bug was this endpoint. |

**Gotcha:** List Contact provider samples wrongly show `DELETE /contacts/person` + `gcId`/`personId` — that is Delete Person, not List. Confirm `GET /profile` on staging.

Flow: Create tag(s) → Add Contact → Address / Payment / Notes / Business / Person as needed.

Dummy: …; person → mock `_id` + `callingCode: "+91"`; update person → lean object; list persons → mock array; delete person → `data: null`.

---

## 12b. UPI ATM (UPI QR Cash Withdrawal)

| Item | Value |
|------|-------|
| Purpose | Cash withdrawal at merchant via dynamic UPI QR (ATM-like, no bank ATM) |
| Flow | QR generate → customer scan → UPI PIN → instant pay-in → merchant cash-out → status check |
| Base path | `https://api.instantpay.in/fi/uatm` |
| Extra header | `X-Ipay-Outlet-Id` (M) — unique merchant outlet id |
| QR display | **30s** (NPCI); total window now **90s** (30 display + 60 txn) |
| Banks / PSPs | Provider screenshot allowlist — confirm on staging |
| Adhikari UI (later) | Under **UPI Cash Point** → label **UPI ATM** |
| Headers | Auth-Code / Client-Id / Client-Secret / Endpoint-Ip + **Outlet-Id** |

### APIs captured

| # | API | Method + path | Request | Response highlights |
|---|-----|---------------|---------|---------------------|
| 34 | Overview | — | — | Concept + 6-step flow |
| 35 | Generate QR | `POST /fi/uatm/generateQr` | `latitude`, `longitude`, `mobile`, `amount`, `externalRef` | `qrString`/`qrMobile`, `qrStatus: INITIATED`, `displayExpirySec: 30`, `ipayId`/`orderid`, `payableValue` vs `transactionValue` |
| 36 | QR Status | `POST /fi/uatm/qrStatus` | `ipayId` | `qrStatus` (`INITIATED`/`SUCCESS`/`FAILED`/`EXPIRED`) + `payer` + balances |

### Suggested backend (UPI ATM)

```
POST /api/banking/upi-atm/qr       → InstantPay POST /fi/uatm/generateQr
POST /api/banking/upi-atm/status   → InstantPay POST /fi/uatm/qrStatus { ipayId }
```

### UPI ATM API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Generate QR | `POST /fi/uatm/generateQr` | Needs `X-Ipay-Outlet-Id`. Body: lat/long/mobile/amount/`externalRef`. Return UPI intent in `qrString`; UI countdown 30s. Store `ipayId` for status. OpenAPI wrongly Aadhaar Pay — ignore schema. |
| QR Status | `POST /fi/uatm/qrStatus` | Body `{ ipayId }` only (+ Outlet-Id header). Poll/webhook for `INITIATED`→`SUCCESS`/`FAILED`/`EXPIRED`. Envelope `orderid` may be null. OpenAPI “Copy of Aadhaar Pay” — ignore. |

Flow: Generate QR → show QR 30s → poll `qrStatus` (and/or webhook) within 90s total → on `SUCCESS` disburse cash.

---

## 13. Provider checklist

- [ ] Reports / statement module on staging
- [ ] Accounts / balance module on staging
- [ ] Contact Book / tags module enabled
- [ ] Business wallet accountNumber (= registered mobile)
- [ ] Linked bank `bankProfileId` + current accountNumber
- [ ] Confirm filter keys + pagination fields per statement mode
- [ ] Confirm `externalRef` rules
- [ ] Confirm bank statement + bank balance **fee** amounts
- [ ] Confirm wallet balance free vs bank balance fee
- [ ] IP allowlist for `X-Ipay-Endpoint-Ip`
- [ ] UPI ATM / UPI QR Cash Withdrawal module on staging
- [ ] Confirm supported banks + PSPs allowlist (from provider screenshots)
- [ ] Confirm QR generate + status endpoints + fee model
- [ ] Confirm `X-Ipay-Outlet-Id` mapping per Adhikari outlet
- [ ] Confirm `payableValue` vs `transactionValue` fee split
- [ ] Confirm status poll uses Generate QR `ipayId` (not `externalRef`)
- [ ] Confirm UPI ATM webhook payload vs poll (`/docs/webhooks`)

---

## Source docs

| Doc | Role |
|-----|------|
| [`BANKING.md`](BANKING.md) | Full pasted pages |
| [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md) | Platform auth / JWT |

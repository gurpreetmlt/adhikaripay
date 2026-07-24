# InstantPay — Collect — Implementation Details

> Compact cheat-sheet. Full pages: [`COLLECT.md`](COLLECT.md). Auth: [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md).

> **Location:** `InstantPay/Unimplemented/` — implement hone pe root me AEPS-style `COLLECT.md` banega.
> **Workflow:** har nayi Collect page → full + ye DETAILS dono update.

**Base docs:** InstantPay Collect overview
**API host:** `https://api.instantpay.in` (confirm per endpoint)
**Status:** 📄 Docs only
**Last updated:** 2026-07-20

---

## 1. What it is (for product / implement)

| Item | Value |
|------|-------|
| Product | **Instantpay Collect** — inbound payments via unique virtual accounts |
| Rails | NEFT, RTGS, IMPS; UPI also mentioned in overview |
| Model | Per-customer **virtual account** → pay-in → Instantpay custody → settle to merchant |
| UPI Static QR | In-store P2M — build BHIM UPI URI + webhook (no generate REST on that page) |
| Virtual Accounts | IMPS/NEFT/RTGS VBA + real-time settle + same GET webhook pattern |
| Benefits | Visibility, reconciliation, lower admin, cash-flow tracking |

Related (Connected Banking VBA overview): [`BANKING.md`](BANKING.md) #0 — Collect is a separate InstantPay product area; keep docs separate until implement clarifies overlap.

---

## 2. Shared auth (when APIs paste)

| Header | Notes |
|--------|-------|
| `X-Ipay-Auth-Code` | Typically `"1"` |
| `X-Ipay-Client-Id` / `X-Ipay-Client-Secret` | InstantPay |
| `X-Ipay-Endpoint-Ip` | End-customer IP — confirm Y/N per page |

JWT alt: [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md).

---

## 3. Page / API matrix

| # | Page | Endpoint | Status |
|---|------|----------|--------|
| 0 | Overview | — (concept) | 📄 |
| 1 | UPI Stack — QR (Static) | Construct `upi://pay?…` + GET webhook | 📄 |
| 2 | Virtual Accounts | VBA concept + GET webhook (no REST on page) | 📄 |

---

## 4. APIs / pages captured

| # | API | Method + path | Request | Response highlights |
|---|-----|---------------|---------|---------------------|
| 0 | Overview | — | — | VBA + NEFT/RTGS/IMPS/UPI collect concept |
| 1 | QR (Static) | — (client-built UPI URI) | `pa={vpa}.{sub}@icici`, `pn`, optional `tn`/`am`, `cu=INR` | Encode as QR; payments via webhook GET |
| 2 | Virtual Accounts | — | Share VBA details; IMPS/NEFT/RTGS | Real-time settle; same webhook GET pattern as #1 |

### UPI Static QR — implement notes

| Item | Value |
|------|-------|
| Generate | Build URI locally / in backend; render QR image |
| Amount | Optional (`am`) — omit for open amount |
| Store name | Optional: Outlet ID in `{sub-string}` + Customer Onboarding API |
| Notify | Partner webhook URL — InstantPay **GET** with status params |
| Setup | https://app.instantpay.in/developers/subscribe → Setup Webhook |
| Verify | First hit → capture `ipayid` → paste on InstantPay portal |

### Virtual Accounts — implement notes

| Item | Value |
|------|-------|
| Modes | IMPS, NEFT, RTGS |
| Settlement | Real-time into bank account |
| Fit | Large-value / multi-payment collections |
| Notify | Same Collect webhook GET + portal verify as Static QR |
| Docs overlap | Near-duplicate of Banking VBA overview — confirm shared vs Collect-specific APIs |
| REST | Not on this page — wait for create/list VBA pastes |

### Suggested backend (Collect)

```
# Static QR — no InstantPay generate endpoint on that page
GET  /api/collect/upi/static-qr   → build upi://pay?… from assigned VPA + outlet sub-string
POST /api/collect/webhooks/upi    → receive InstantPay GET callback (or raw GET route)
# Virtual Accounts — REST TBD
# GET|POST /api/collect/vba/…     → InstantPay paths TBD
```

### Collect API summary

| Op | InstantPay | Notes |
|----|------------|-------|
| Static BHIM QR | URI template (no REST generate on that page) | `pa={assigned-vpa}.{sub-string}@icici&pn=…&cu=INR`; optional `am`/`tn`. Webhook GET; confirm param names. |
| Virtual Accounts | Concept + webhook (no REST on page) | IMPS/NEFT/RTGS, real-time settle. Same webhook setup as Static QR. Overlap w/ Banking VBA TBD. |

---

## 5. Provider checklist

- [ ] Collect module enabled on staging
- [ ] Confirm assigned VPA prefix + PSP host (`@icici` or other)
- [ ] Confirm `{sub-string}` / Outlet ID rules + Customer Onboarding link
- [ ] Confirm VBA create / list / deactivate endpoints (Collect)
- [ ] Confirm webhook GET param names (`ipay_id` vs `ipayid`, etc.)
- [ ] Confirm one webhook URL covers Static QR + VBA (or separate)
- [ ] Confirm pending → SUCCESS / REFUND behaviour
- [ ] Confirm settlement cycle + fees
- [ ] Clarify overlap vs Connected Banking Virtual Bank Accounts
- [ ] Clarify overlap vs Banking UPI ATM (`/fi/uatm`) — different product
- [ ] IP allowlist

---

## Source docs

| Doc | Role |
|-----|------|
| [`COLLECT.md`](COLLECT.md) | Full pasted pages |
| [`OVERVIEW_DETAILS.md`](OVERVIEW_DETAILS.md) | Platform auth / JWT |
| [`BANKING.md`](BANKING.md) | Related VBA overview (Connected Banking) + UPI ATM (different) |

# PaySprint — Overview — Implementation Details

> Compact cheat-sheet. Full pages: [`OVERVIEW.md`](OVERVIEW.md).

> **Location:** `PaySprint/Unimplemented/` — implement hone pe root me AEPS-style doc banao.
> **Workflow:** har nayi Overview page → full + ye DETAILS dono update.

**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm with PaySprint (docs often `sit.paysprint.in` or placeholder `xyz.xyz.in`)
**Protocol:** REST + JSON (+ JWT header; some bodies AES-128)
**Status:** Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

| Item | Value |
|------|-------|
| Product | PaySprint platform entry |
| Auth | JWT HS256 + optional Authorisedkey (UAT) |
| Wallet | Common wallet — Main + Cash balance APIs |
| Docs split | Doc.1 = core banking (DMT/AePS/Onboard); Doc.2 = NSDL CD / MATM / Payout / CMS / Travel / UPI Cashout |

---

## 2. Auth & headers

| Item | Notes |
|------|-------|
| JWT | HS256; payload `timestamp`, `partnerId`, `reqid` |
| Header | `Token: <jwt>` |
| Authorisedkey | UAT only (if not shared IP) |
| AES-128 | Key + IV from credentials — some AePS/onboard bodies |
| IP | India-only allowlist |

```env
PAYSPRINT_PARTNER_ID=
PAYSPRINT_JWT_SECRET=
PAYSPRINT_AES_KEY=
PAYSPRINT_AES_IV=
PAYSPRINT_AUTHORISED_KEY=   # UAT
PAYSPRINT_MODE=dummy|paysprint_uat|paysprint_live
```

---

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | Getting Started | `—` | 📄 |
| 2 | Authentication | `JWT + AES notes` | 📄 |
| 3 | UAT Credentials | `—` | 📄 |
| 4 | Main / Cash Balance | `POST /balance/...` | 📄 |

---

## 4. Implement fields (high-signal)

Start with AUTHENTICATION + BALANCE before any product rail.

---

## 5. Flows

1. Get UAT keys → 2. Generate JWT → 3. Hit mainbalance → 4. Pick product suite doc.

---

## 6. Gotchas

- Placeholder OpenAPI hosts (`xyz.xyz.in`)
- Timestamp unit inconsistency (ms vs seconds) across JWT samples

---

## 7. Provider checklist

- [x] Capture Getting Started
- [x] Capture Auth + Credentials pages
- [ ] Confirm Live base URL + UAT host from PaySprint
- [ ] Confirm JWT timestamp unit
- [ ] IP allowlist

---

## Source docs

| Doc | Role |
|-----|------|
| [`OVERVIEW.md`](OVERVIEW.md) | Full archive |
| [`OVERVIEW.md`](OVERVIEW.md) | Getting Started |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES / IP |

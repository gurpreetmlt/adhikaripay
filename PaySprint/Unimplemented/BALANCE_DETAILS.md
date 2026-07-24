# PaySprint — Balance — Implementation Details

> Compact cheat-sheet. Full pages: [`BALANCE.md`](BALANCE.md).

> **Location:** `PaySprint/Unimplemented/` — implement hone pe root me AEPS-style doc banao.
> **Workflow:** har nayi Balance page → full + ye DETAILS dono update.

**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm with PaySprint (docs often `sit.paysprint.in` or placeholder `xyz.xyz.in`)
**Protocol:** REST + JSON (+ JWT header; some bodies AES-128)
**Status:** Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Main + Cash wallet balance APIs — call before debiting product rails.

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
| 1 | Main Balance | `POST /balance/balance/mainbalance` | 📄 |
| 2 | Cash Balance | `POST /balance/balance/cashbalance` | 📄 |

---

## 4. Implement fields (high-signal)

**Main:** headers Token (+ Authorisedkey UAT). Body often empty / minimal — confirm.

**Cash:** similar; response uses `cdwallet`.

Smoke-test auth with Main Balance after JWT setup.


---

## 5. Flows

JWT → Main Balance → (optional) Cash Balance → product API.

---

## 6. Gotchas

- Empty body vs `{{}}` — confirm
- Distinct from InstantPay wallet

---

## 7. Provider checklist

- [x] Both balance APIs captured
- [ ] Confirm request body empty vs object
- [ ] Wire health-check in backend

---

## Source docs

| Doc | Role |
|-----|------|
| [`BALANCE.md`](BALANCE.md) | Full archive |
| [`OVERVIEW.md`](OVERVIEW.md) | Getting Started |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES / IP |

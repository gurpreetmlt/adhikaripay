# PaySprint — Authentication — Implementation Details

> Compact cheat-sheet. Full pages: [`AUTHENTICATION.md`](AUTHENTICATION.md).

> **Location:** `PaySprint/Unimplemented/` — implement hone pe root me AEPS-style doc banao.
> **Workflow:** har nayi Authentication page → full + ye DETAILS dono update.

**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm with PaySprint (docs often `sit.paysprint.in` or placeholder `xyz.xyz.in`)
**Protocol:** REST + JSON (+ JWT header; some bodies AES-128)
**Status:** Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

Platform-wide JWT + AES + IP gate for all PaySprint product APIs.

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
| 1 | JWT create | `HS256 payload` | 📄 |
| 2 | AES-128 | `body encrypt` | 📄 |
| 3 | Authorisedkey | `UAT header` | 📄 |
| 4 | IP allowlist | `India only` | 📄 |

---

## 4. Implement fields (high-signal)

| Field | M/O | Notes |
|-------|-----|-------|
| `Token` | M | JWT |
| `Authorisedkey` | UAT* | Skip on Live |
| `timestamp` | M | Unit TBD |
| `partnerId` | M | From PaySprint |
| `reqid` | M | Unique int |


---

## 5. Flows

Generate JWT per request (or short TTL) → attach headers → call product API.

---

## 6. Gotchas

- Timestamp unit conflict (ms vs s)
- Do not ship PHP JWT library dump into app
- Never commit JWT/AES secrets

---

## 7. Provider checklist

- [x] Auth pages captured
- [ ] Confirm timestamp unit with PaySprint
- [ ] Confirm AES mode/padding
- [ ] UAT IP allowlist

---

## Source docs

| Doc | Role |
|-----|------|
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | Full archive |
| [`OVERVIEW.md`](OVERVIEW.md) | Getting Started |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES / IP |

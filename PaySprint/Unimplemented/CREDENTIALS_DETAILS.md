# PaySprint — Credentials — Implementation Details

> Compact cheat-sheet. Full pages: [`CREDENTIALS.md`](CREDENTIALS.md).

> **Location:** `PaySprint/Unimplemented/` — implement hone pe root me AEPS-style doc banao.
> **Workflow:** har nayi Credentials page → full + ye DETAILS dono update.

**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Base URL (UAT):** confirm with PaySprint (docs often `sit.paysprint.in` or placeholder `xyz.xyz.in`)
**Protocol:** REST + JSON (+ JWT header; some bodies AES-128)
**Status:** Docs captured — not wired yet
**Last updated:** 2026-07-20

---

## 1. What it is

UAT key material for JWT/AES/Authorisedkey/PartnerId.

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
| 1 | UAT Credentials table | `—` | 📄 |

---

## 4. Implement fields (high-signal)

Map PDF titles → env vars listed in AUTHENTICATION_DETAILS.

---

## 5. Flows

Receive keys from PaySprint → put in env → generate JWT smoke test via Balance API.

---

## 6. Gotchas

- PDF typo ENVIORMENT
- Mask all secrets in docs/logs

---

## 7. Provider checklist

- [x] UAT table captured (masked)
- [ ] Live credentials from PaySprint
- [ ] Secret rotation if PDF leaked real keys

---

## Source docs

| Doc | Role |
|-----|------|
| [`CREDENTIALS.md`](CREDENTIALS.md) | Full archive |
| [`OVERVIEW.md`](OVERVIEW.md) | Getting Started |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | JWT / AES / IP |

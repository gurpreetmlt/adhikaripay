# PaySprint — MATM (Fino) — Implementation Details

> Compact cheat-sheet. Full: [`MATM.md`](MATM.md).
**Base URL (Live):** `https://api.paysprint.in/service-api/api/v1/service`
**Last updated:** 2026-07-20

## 1. What it is

Fino MATM SDK + three-way recon + query.

## 2. Auth

JWT `Token` + UAT `Authorisedkey`. Env: `PAYSPRINT_*` (see AUTHENTICATION_DETAILS).

## 3. Page / API matrix

| # | Page / API | Endpoint | Status |
|---|------------|----------|--------|
| 1 | Three-way update | `POST /matm/threeway/update` | 📄 |
| 2 | MATM query | `POST /matm/matmquery/query/` | 📄 |
| 3 | SDK | `Drive / AAR links in PDF` | 📄 |

## 4. Implement fields

Implement three-way recon as mandatory post-SDK step. Trailing slash on query path — keep as documented.

## 5. Flows

SDK txn → threeway/update → matmquery as needed. Also wire CALLBACKS for async.

## 6. Gotchas

- Typo Implementation Rquirements
- Path ends with `/query/` trailing slash
- Separate from AePS CW

## 7. Provider checklist

- [x] MATM APIs captured
- [ ] SDK version pin
- [ ] Three-way failure replay rules

## Source

[`MATM.md`](MATM.md) · [`AUTHENTICATION.md`](AUTHENTICATION.md)

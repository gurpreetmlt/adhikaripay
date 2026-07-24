# PaySprint — Authentication

> Raw PaySprint docs. **Cheat-sheet:** [`AUTHENTICATION_DETAILS.md`](AUTHENTICATION_DETAILS.md).

**Provider:** PaySprint
**Status:** 📄 Docs only
**Last updated:** 2026-07-20
**Source PDF:** `PaySprint Doc. 1.pdf` (pages 4–16)

---

## Service-wise status

| # | Topic | Status |
|---|-------|--------|
| 1 | JWT overview / structure | 📄 |
| 2 | Token creation (HS256) | 📄 |
| 3 | Sample code (PHP / C# / Java) | 📄 (library dumps — prefer short samples) |
| 4 | AES-128 body encryption | 📄 |
| 5 | IP address restriction | 📄 |
| 6 | Authorisedkey (UAT) | 📄 |

---

## 1. JWT authentication

All API requests must include a **JWT** in the request header.

| | |
|--|--|
| **Algorithm** | `HS256` |
| **Header claim** | Pass token as `Token` header |
| **Signing secret** | Partner JWT key from credentials |

### JWT payload (provider sample)

```json
{
  "timestamp": 1541044257000,
  "partnerId": "PROVIDED BY PAYSPRINT",
  "reqid": "122333"
}
```

| Field | Notes |
|-------|-------|
| `timestamp` | Docs say "seconds" and "valid ~5 minutes" but sample looks like **milliseconds**; C# sample uses `ToUnixTimeMilliseconds()`, Java sample uses epoch **seconds** — **confirm with PaySprint** |
| `partnerId` | Issued by PaySprint (e.g. `PS00XX`) |
| `reqid` | Unique integer per request |

Optional claims in Java sample: `iss` / `product` (`WALLET`) — marked not compulsory.

### Sample request header usage

```bash
curl --location --request POST 'https://api.paysprint.in/service-api/api/v1/service/balance/balance/mainbalance' \
--header 'Token: {{jwt}}' \
--header 'Authorisedkey: {{authorisedkey}}' \
--header 'Content-Type: application/json'
```

---

## 2. AES-128 body encryption

> "All body value must be encrypted using AES-128 with the help of key and iv provided by API provider."

| Item | Notes |
|------|-------|
| Mode | AES-128 (exact mode/padding not fully specified on this page — confirm CBC/ECB + PKCS) |
| Key / IV | From UAT/Live credentials |
| Where used | Emphasized for sensitive AePS / onboard bodies; not every Balance call may encrypt — confirm per product |

---

## 3. IP address restriction

- Only **Indian IP** addresses whitelisted
- Server location must be **India only**

---

## 4. Authorisedkey

| Env | Rule |
|-----|------|
| **UAT** | Required in header if partner is **not** using shared IP |
| **Live** | **Not** required (per provider note) |

Casing variants across PDF: `Authorisedkey` / `authorisedkey` / `authorizedkey`.

---

## 5. PDF pollution on this section

- Pages 8–14 dump entire **firebase/php-jwt** class and long C#/Java samples — noisy for implementers
- Placeholder secret in C# sample: mask / never reuse (`UFMwMDEy…` style keys in PDF are **examples** — rotate if ever real)
- Typo: `IP ADDRESS RESTICTION`
- Page 16 "PaySprint Tabs" empty template table — ignore

### Related

- [`CREDENTIALS.md`](CREDENTIALS.md)
- [`OVERVIEW.md`](OVERVIEW.md)

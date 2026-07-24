# PaySprint — Credentials (UAT)

> **Cheat-sheet:** [`CREDENTIALS_DETAILS.md`](CREDENTIALS_DETAILS.md).

**Provider:** PaySprint
**Status:** 📄 Docs only
**Last updated:** 2026-07-20
**Source PDF:** `PaySprint Doc. 1.pdf` (pages 17–18)

---

## UAT Credentials (masked)

| Title | Value (masked) | Description |
|-------|----------------|-------------|
| ENVIRONMENT | UAT | User Acceptance Testing (PDF typo: `ENVIORMENT`) |
| JWT KEY | `xxxxx` | JWT Token generation key |
| AES ENCRYPTION KEY | `xxxxx` | AES encryption |
| AES ENCRYPTION IV | `xxxxx` | AES IV |
| PARTNERID | `PSXXXX` | Partner ID |
| Authorisedkey | `xxxxx` | UAT header key |

> **Never commit real values.** Store in Coolify / local `.env` only. PDF may contain live-looking samples — treat as compromised until rotated with PaySprint.

### Gotchas

- Live credentials are separate (not on this page)
- Authorisedkey UAT-only rule — see AUTHENTICATION

### Related

- [`AUTHENTICATION.md`](AUTHENTICATION.md)

# PaySprint — DMT Bank List — Implementation Details

> Compact cheat-sheet. Full list: [`DMT_BANK_LIST.md`](DMT_BANK_LIST.md). Suite: [`DMT_DETAILS.md`](DMT_DETAILS.md).

**Source:** `DMT-BANK-LIST.xlsx`
**Rows:** 1903
**Status:** 📄 Docs captured — seed/cache at implement time
**Last updated:** 2026-07-21

---

## 1. What it is

| Item | Value |
|------|-------|
| Purpose | Map `bankid` ↔ bank display name for DMT bene |
| Columns | `BankId` (int), `BankName` (string) |
| Count | 1903 |
| IFSC | **Not in this file** — collect from user / IFSC API |

---

## 2. Implement fields

| Field | Where | Notes |
|-------|-------|-------|
| `bankid` | Bene sendotp / add_bene / verify | Numeric id from this master |
| `BankName` | UI dropdown label | From master; do not hardcode |
| `ifsccode` | Bene APIs | Separate input (11-char IFSC) |
| `accno` | Bene APIs | Account number |
| `benename` | Bene APIs | Account holder name |

---

## 3. Suggested storage

```text
Table/collection: paysprint_dmt_banks
  bank_id   INT  PK
  bank_name TEXT
  updated_at
```

- Seed from [`DMT_BANK_LIST.md`](DMT_BANK_LIST.md) or re-import Excel on update.
- UI: searchable dropdown by name → submit `bankid`.

---

## 4. Sample (first / last)

| BankId | BankName |
|--------|----------|
| 1 | AP MAHESH COOPERATIVE URBAN BANK LIMITED |
| 2 | ABHYUDAYA COOPERATIVE BANK LIMITED |
| 3 | ABHYUDAYA MAHILA URBAN COOPERATIVE BANK LIMITED |
| … | … |
| 1942 | NSDL Payments Bank Limited |

Full table → [`DMT_BANK_LIST.md`](DMT_BANK_LIST.md).

---

## 5. Gotchas

- Upsert by `BankId` when Excel refreshes
- No IFSC in master
- ≠ InstantPay bank list
- Mask account numbers in logs; bank names OK

---

## 6. Provider checklist

- [x] Excel converted to markdown (1903 banks)
- [ ] Seed script / migration when implementing DMT
- [ ] Searchable bank picker in web + mobile
- [ ] Process for PaySprint Excel updates

---

## Source docs

| Doc | Role |
|-----|------|
| [`DMT_BANK_LIST.md`](DMT_BANK_LIST.md) | Full BankId / BankName table |
| [`DMT.md`](DMT.md) | DMT API archive |
| [`DMT_DETAILS.md`](DMT_DETAILS.md) | DMT implement cheat-sheet |

# 10 — Retailer services (high level)

Retailer spends wallet on catalog services (AEPS, DMT, BBPS, recharge, etc.).

| Topic | Where |
|-------|--------|
| Catalog | `apps/backend/src/modules/catalog` |
| Txn execute | `apps/backend/src/modules/transactions` |
| InstantPay | `apps/backend/src/modules/providers` + `InstantPay/` |
| Task split | `docs/TASKS/09-retailer-aeps.md`, `10-retailer-dmt.md`, `14-…`, `21-instantpay-adapter.md` |

Commission settles up the hierarchy after successful txns (`commission` module).

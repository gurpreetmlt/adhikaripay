# Task 12 — Wallet & Ledger

## Size: M

## Goal
Txn PIN on wallet fund/transfer; double-entry ledger correct.

## Read ONLY
| Path | Why |
|------|-----|
| `apps/backend/src/modules/wallet/wallet.routes.ts` | Fund/transfer |
| `apps/backend/src/modules/wallet/wallet.service.ts` | Ledger writes |
| `apps/backend/src/modules/auth/txnPin.ts` | PIN verify |
| `apps/backend/src/db/postgres/schema/wallets.ts` | Schema |

## Gap (check first)
- Wallet transfer may lack txn PIN — add if missing

## Do NOT read
- Mongo models unless audit log task

## Test
Distributor `9222222222` → transfer to retailer → passbook both sides

## Done when
- [ ] PIN required on fund + transfer
- [ ] Idempotency key enforced
- [ ] Balance never negative

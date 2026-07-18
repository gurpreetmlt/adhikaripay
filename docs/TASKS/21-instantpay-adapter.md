# Task 21 — InstantPay provider adapter

## Size: L (split per rail across chats)
## Depends: 09 (AEPS), 10 (DMT), 14 (BBPS)

## Goal (1 line)
Real InstantPay adapter behind the existing `ProviderAdapter` contract so AEPS / DMT / BBPS stop using stubs.

## Read ONLY these files
| Path | Why |
|------|-----|
| `apps/backend/src/modules/providers/types.ts` | Adapter contract |
| `apps/backend/src/modules/providers/provider.registry.ts` | Register `instantpay` |
| `apps/backend/src/modules/providers/adapters/eko.adapter.ts` | Reference stub shape |
| `apps/backend/src/modules/providers/provider.router.ts` | Routing + stub guard |
| `apps/backend/src/config/env.ts` | Add INSTANTPAY_* env vars |

## Do NOT read
- `apps/partner-web`, `apps/retailer-web` (legacy)
- Frontend apps (no UI change in this task)

## Docs
- https://developers.instantpay.in/reference/overview (auth + per-service pages as needed)

## Steps (one chat per step)
1. Chat A: auth/signature + `instantpay.adapter.ts` skeleton + registry entry + env vars
2. Chat B: AEPS ops (balance, withdraw, mini statement, aadhaar pay) + checkStatus
3. Chat C: DMT (add beneficiary, transfer)
4. Chat D: BBPS (fetch bill, pay bill) + recharge
5. Seed `providers` + `provider_services` rows → route ops to `instantpay`

## Test
```bash
npm run dev:backend   # then hit sandbox creds against /api endpoints
```

## Done when
- [ ] Adapter registered, env-gated creds, no stub flag
- [ ] Each rail returns normalized ProviderResult from real sandbox
- [ ] provider_services rows route to instantpay

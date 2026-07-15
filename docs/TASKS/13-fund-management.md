# Task 13 — Fund Management

## Size: M

## Goal
Admin load float; distributor fund request; admin approve.

## Read ONLY
| Path | Why |
|------|-----|
| `apps/backend/src/modules/wallet/wallet.routes.ts` | POST /fund |
| `apps/admin-web/app/dashboard/page.tsx` | Admin fund UI |
| `apps/web/app/dashboard/page.tsx` | Partner fund UI |

## Roles
- Admin: `POST /wallet/fund` (admin only)
- Distributor → retailer: `POST /wallet/transfer`

## May need NEW
- `fund_requests` table + routes (if not exists — check schema first)

## Test
Admin funds MD → MD funds distributor → dist funds retailer

## Done when
- [ ] Admin can load master float
- [ ] Downline fund from web works with PIN

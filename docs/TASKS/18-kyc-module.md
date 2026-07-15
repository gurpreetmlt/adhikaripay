# Task 18 — KYC Module

## Size: L — split: (1) backend routes (2) admin queue UI (3) mobile Sales Agent submit

## Read ONLY
| Path | Why |
|------|-----|
| `apps/backend/src/db/postgres/schema/users.ts` | kycStatus field |
| `apps/admin-web/app/dashboard/page.tsx` | Admin UI mount |
| `apps/mobile/src/screens/RoleHomeScreens.tsx` | Field agent |

## Goal
Queue pending KYC → approve/reject → update user kycStatus

## Sales Agent
Admin role + permissions later — for now admin approves

## Test
Submit KYC docs → admin sees queue → approve → retailer can txn

## Done when
- [ ] KYC list API
- [ ] Approve/reject writes audit
- [ ] Retailer blocked until verified

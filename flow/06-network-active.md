# 06 — Network, active, reassign

## Agent network
- `GET /api/users/network` — tree + direct downline + upline (Dist/Retailer)
- `PATCH /api/users/:id/active` — SD/Dist only, **direct children**
- UI: [`apps/web/app/network/page.tsx`](../apps/web/app/network/page.tsx)

## Admin reassign
- `POST /api/admin/users/:id/reassign` `{ newParentId | newParentUid }`
- Rebuilds `user_hierarchy` closure; wallets unchanged
- UI: agent detail [`apps/admin-web/app/users/[id]/page.tsx`](../apps/admin-web/app/users/[id]/page.tsx)

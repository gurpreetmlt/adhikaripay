# 03 — Retailer signup (sponsor Dist)

Retailer self-signup under a **Distributor** (phone search).

1. Enter name, own mobile, **Distributor 10-digit phone**
2. `GET /api/auth/sponsor/search?mobile=XXX` (min **3** digits, prefix match) → list of active Distributors
3. Tap Dist in list to select (exact 10-digit + 1 match auto-selects)
4. `POST /api/auth/signup/request` → OTP (uses selected `sponsorUid`)
5. `POST /api/auth/signup/verify` → retailer `parentId` = Dist

Legacy: `GET /api/auth/sponsor/:uid` still works.

## UI
- Web: [`apps/web/app/signup/page.tsx`](../apps/web/app/signup/page.tsx)
- Mobile: `apps/adhikaripay-mobile-app/src/screens/signup/SignupScreen.tsx`

## Backend
- [`auth.service.ts`](../apps/backend/src/modules/auth/auth.service.ts) — `searchSponsorsByMobile`, `verifySignupOtp` → `registerUser(distributor, retailer)`

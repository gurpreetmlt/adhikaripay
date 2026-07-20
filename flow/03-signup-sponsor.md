# 03 — Retailer signup (sponsor Dist)

Retailer self-signup under a **Distributor** (phone search).

1. Enter name, **own mobile**, then **Distributor 10-digit phone**
2. Full Dist mobile → auto-select Dist name (no list/tap)
3. `POST /api/auth/signup/request` → OTP (uses selected `sponsorUid`)
4. `POST /api/auth/signup/verify` → retailer `parentId` = Dist

Lookup: `GET /api/auth/sponsor/search?mobile=XXXXXXXXXX` (exact 10 digits).

## UI
- Web: [`apps/web/app/signup/page.tsx`](../apps/web/app/signup/page.tsx)
- Mobile: `apps/adhikaripay-mobile-app/src/screens/signup/SignupScreen.tsx`

## Backend
- [`auth.service.ts`](../apps/backend/src/modules/auth/auth.service.ts) — `searchSponsorsByMobile`, `verifySignupOtp` → `registerUser(distributor, retailer)`

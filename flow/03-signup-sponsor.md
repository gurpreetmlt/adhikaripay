# 03 — Agent signup (role + upline mobile)

Public Register on agent portal / mobile.

## Roles

| Signup as | Upline mobile | Parent role | Child created |
|-----------|---------------|-------------|-----------------|
| Super Distributor | Admin | `admin` | `master_distributor` |
| Distributor | Super Dist | `master_distributor` | `distributor` |
| Retailer | Distributor | `distributor` | `retailer` |

## Flow

1. Select role (top of form)
2. Name + own mobile
3. Enter upline **10-digit mobile** → auto-resolve name via search
4. `POST /api/auth/signup/request` `{ name, mobile, sponsorUid, role, portal: "agent" }`
5. `POST /api/auth/signup/verify` (same + otp) → `registerUser(sponsor, childRole)`

Lookup: `GET /api/auth/sponsor/search?mobile=XXXXXXXXXX&role=admin|master_distributor|distributor`

## UI

- Web: [`apps/web/app/signup/page.tsx`](../apps/web/app/signup/page.tsx)
- Mobile: `apps/adhikaripay-mobile-app/src/screens/signup/SignupScreen.tsx`

## Backend

- [`auth.service.ts`](../apps/backend/src/modules/auth/auth.service.ts) — `searchSponsorsByMobile(mobile, role)`, `requestSignupOtp` / `verifySignupOtp` with `childRole` in OTP meta
- Validators: `role` on signup request/verify; `role` on sponsor search query

## After signup

- Retailer → InstantPay Register Outlet (`/onboarding/outlet`) then PIN
- Super Dist / Distributor → PIN only

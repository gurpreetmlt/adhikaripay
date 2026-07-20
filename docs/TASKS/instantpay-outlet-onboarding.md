# InstantPay Register Outlet = retailer onboarding

## Product decision
Retailer primary onboarding uses **InstantPay Register Outlet** (Min-KYC), not Adhikari `/kyc`.

Funnel: Login/Signup → `/onboarding/outlet` → `/onboarding/pin` → Dashboard
Next chat: Bio-KYC UI + mobile parity.

## Done
- [x] `AuthUser.hasInstantpayOutlet`
- [x] `nextOnboardingPath` / gate → `/onboarding/outlet`
- [x] Web Min-KYC form → `POST /onboarding/instantpay`

## Read ONLY
- `InstantPay/ONBOARDING.md`
- `apps/web/app/onboarding/outlet/page.tsx`
- `apps/web/lib/onboarding.ts`
- `apps/backend/src/modules/onboarding/*`
- `packages/shared-types/index.ts`

## Still pending
- Bio-KYC screens + `wadh` RD capture
- Mobile Register Outlet

# Task 21 — InstantPay provider adapter

## Size: L (split per rail across chats)
## Depends: 09 (AEPS), 10 (DMT), 14 (BBPS)

## Goal (1 line)
Real InstantPay adapter behind the existing `ProviderAdapter` contract so AEPS / DMT / BBPS stop using stubs.

## Done (AEPS dummy↔live switch — this chat)

- [x] `AEPS_PROVIDER_MODE=dummy|instantpay_sandbox|instantpay_live` + fail-closed creds check
- [x] `InstantPayAdapter` registered (`agentAuth`, balance, withdraw, mini statement, aadhaar pay, checkStatus)
- [x] AEPS services resolve by mode (dummy → eko stub, instantpay_* → InstantPay; no silent fallback)
- [x] Daily agent 2FA routes through provider `agentAuth`
- [x] InstantPay `outletLoginStatus` wired into `GET /auth/agent-auth/status` (LOGGEDIN / LOGINREQUIRED)
- [x] Compliance gates: KYC, geofence, bio-mismatch/EDD, dormancy, cash receipt register
- [x] Migration `0013_aeps_compliance.sql`
- [x] Transaction OTP (₹5,000+ withdrawal): `POST /txn/aeps/withdraw/otp` → `referenceKey`; OTP rides in PID (`Opts otp=""`); mobile UI OTP step
- [x] Cash Deposit: `POST /txn/aeps/deposit` (debit AEPS wallet) → InstantPay `/fi/aeps/cashDeposit`; mobile Deposit tab live; migration `0014` seeds hidden AEPS rail service rows
- [x] Mini Statement: backend already mapped `miniStatement[]` (date/txnType/amount/narration); mobile now renders the recent-txn list instead of a generic alert
- [x] Bank List: `GET /txn/aeps/banks` → InstantPay `GET /fi/aeps/banks` (dummy has real IINs); mobile static IINs replaced with real NPCI IINs + live override by name

## Remaining (next chats)

- [ ] InstantPay DMT / BBPS / recharge rails
- [ ] Merchant onboarding API → populate `instantpay_outlet_id` + outlet geo
- [ ] Customer photo / CCTV object storage for cash evidence
- [ ] Seed `provider_services` for non-mode-routed rails

## Deploy env

### Testing (current)

```env
AEPS_PROVIDER_MODE=dummy
ALLOW_STUB_PROVIDERS=true
ALLOW_BIOMETRIC_REPLAY=false
```

### InstantPay sandbox

```env
AEPS_PROVIDER_MODE=instantpay_sandbox
ALLOW_STUB_PROVIDERS=false
ALLOW_BIOMETRIC_REPLAY=false
INSTANTPAY_CLIENT_ID=...
INSTANTPAY_CLIENT_SECRET=...
INSTANTPAY_AES_KEY=...   # 32 utf8 chars OR base64 of 32 bytes
INSTANTPAY_AUTH_CODE=1
# optional:
# INSTANTPAY_BASE_URL=https://api.instantpay.in
```

### Production live

```env
AEPS_PROVIDER_MODE=instantpay_live
ALLOW_STUB_PROVIDERS=false
ALLOW_BIOMETRIC_REPLAY=false
INSTANTPAY_CLIENT_ID=...
INSTANTPAY_CLIENT_SECRET=...
INSTANTPAY_AES_KEY=...
INSTANTPAY_AUTH_CODE=1
```

Retailer rows need `instantpay_outlet_id`, `outlet_latitude`, `outlet_longitude` before live AEPS.

## Read ONLY these files
| Path | Why |
|------|-----|
| `apps/backend/src/modules/providers/types.ts` | Adapter contract |
| `apps/backend/src/modules/providers/provider.registry.ts` | Register `instantpay` |
| `apps/backend/src/modules/providers/adapters/instantpay.adapter.ts` | HTTP adapter |
| `apps/backend/src/modules/providers/provider.router.ts` | Mode routing + stub guard |
| `apps/backend/src/config/env.ts` | AEPS_PROVIDER_MODE + INSTANTPAY_* |

## Docs
- https://developers.instantpay.in/reference/overview
- https://developers.instantpay.in/reference/financial-inclusion-aeps-outlet-login

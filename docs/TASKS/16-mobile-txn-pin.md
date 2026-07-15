# Task 16 — Mobile Txn PIN Modal

## Size: S

## Read ONLY
| Path | Why |
|------|-----|
| `apps/mobile/src/screens/LoginScreen.tsx` | Patterns |
| `apps/backend/src/modules/auth/txnPin.ts` | Verify API |

## Goal
Reusable PIN modal before any money API call

## May need
- `POST /auth/txn-pin/verify` route if not wired

## Test
Any txn → PIN modal → wrong PIN fails → correct succeeds

## Done when
- [x] PinInput component
- [x] Used before txn API calls

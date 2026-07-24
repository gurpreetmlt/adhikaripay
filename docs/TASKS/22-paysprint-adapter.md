# Task 22 — PaySprint provider adapter (DMT + AEPS only)

## Size: L (split per rail across chats)
## Depends: 21 (InstantPay adapter — same `ProviderAdapter` contract)
## Branch: `api-providers`

## Goal (1 line)
Real `PaySprintAdapter` (stub today, 6 lines) behind the existing `ProviderAdapter`
contract so DMT and AEPS can route to PaySprint as a second provider — via
`provider_services` priority, not a new routing mechanism.

## Scope — only what's in the app AND in PaySprint docs
- ✅ **DMT (CASA)** — docs captured: `PaySprint/Unimplemented/DMT.md` (19 endpoints, account-opening chain)
- ✅ **AEPS** — docs captured: `PaySprint/Unimplemented/AEPS.md`, `AEPS_DETAILS.md`, `AEPS_BANK4*.md`
- ❌ BBPS / Recharge / Travel / MATM / CMS / Credit Card leads — **not in scope** (no PaySprint docs captured yet, or not in app). Add only when both exist.

## Environment
All PaySprint calls go through **UAT/sandbox first** (`PaySprint Doc. 1.pdf` — UAT needs `Authorisedkey` header, Live doesn't). Mirror the InstantPay 3-mode pattern:
```
PAYSPRINT_MODE=dummy | paysprint_sandbox | paysprint_live
```
Fail-closed: missing creds in sandbox/live mode → startup fails (same as InstantPay).

## Do NOT do in this task
- No admin UI (that's Task 23)
- No auto-failover logic (Part C financial-safety rules — separate shared module, Task 24)
- No BBPS/Recharge PaySprint rails

## Read ONLY these files
| Path | Why |
|------|-----|
| `apps/backend/src/modules/providers/types.ts` | Adapter contract (`dmt*`, `aeps*` methods) |
| `apps/backend/src/modules/providers/adapters/paysprint.adapter.ts` | Currently a 6-line stub — build this out |
| `apps/backend/src/modules/providers/adapters/instantpay.adapter.ts` | Reference pattern only (don't copy blindly — flow differs, see below) |
| `apps/backend/src/modules/providers/provider.registry.ts` | Already registers `paysprint` — no change needed unless adding new methods |
| `apps/backend/src/modules/providers/provider.router.ts` | Mode routing — extend for `PAYSPRINT_MODE` |
| `apps/backend/src/config/env.ts` | Add `PAYSPRINT_*` env vars |
| `PaySprint/Unimplemented/DMT.md` | DMT endpoint contracts (19 steps) |
| `PaySprint/Unimplemented/AEPS.md` + `AEPS_DETAILS.md` | AEPS endpoint contracts |

## Key difference from InstantPay (don't assume same flow)
PaySprint DMT has a **separate account-opening eKYC chain** (`check_aadhaar → check_pan →
ekyc → check_pincode → generate_otp → submit_account_details → revision`) that
InstantPay's DMT does not have. Map PaySprint's 19 steps to the same
`dmt*` adapter methods our `txn.controller.ts` already calls — do not change the
controller/route contract, only the adapter internals.

## Steps
1. ✅ `AEPS_PROVIDER_MODE` extended with `paysprint_sandbox`/`paysprint_live` + fail-closed creds check (`assertPaySprintProviderConfig` in `env.ts`, called from `server.ts`)
2. ✅ `PaySprintAdapter` — AEPS methods wired (bankList/agentAuth/balance/txnOtp/withdraw/miniStatement/aadhaarPay/checkStatus) via `paysprint/client.ts` (JWT HS256 + AES-128-CBC helper + fetch wrapper). **Not smoke-tested against real UAT yet** — field names/endpoint pipe are best-effort per docs, several marked "confirm with PaySprint" (see adapter file header comment).
3. 🟡 `PaySprintAdapter` — DMT partially wired:
   - ✅ `dmtRemitterProfile` (QueryRemitter), `dmtAddBeneficiary`/`Verify` (sendotp/add_bene), `dmtDeleteBeneficiary` (single-call — PaySprint has no separate delete-OTP step; `Verify` is a no-op pass-through), `dmtGenerateTransactionOtp`+`dmtTransfer` (send_otp/process), `dmtTransactionRefundOtp`+`dmtTransactionRefund` (resendotp/index), `checkStatus` now branches DMT vs AEPS query endpoint
   - ⬜ `dmtRemitterRegister`/`RegisterVerify`/`Kyc` — **blocked, not a guess**: PaySprint's account-opening chain (check_aadhaar → check_pan → ekyc → check_pincode → generate_otp → submit_account_details) needs address/PAN/biometric fields our `DmtRemitterRegistrationParams`/`DmtRemitterKycParams` don't carry. Needs PaySprint to confirm whether an already-banked remitter can skip account-opening entirely (then `dmtRemitterProfile` alone may suffice) before this can be mapped without changing the adapter contract.
   - ⬜ `dmtBankList` — PaySprint bank list is a static 1903-row asset (`DMT_BANK_LIST.md`), not a live API; needs a seed step, not an adapter call.
   - Nepal/BBPS/Recharge still throw `501 PROVIDER_NOT_IMPLEMENTED` (deliberate — no fabricated success on unimplemented money-moving ops; out of scope per README, PaySprint has no BBPS/Recharge docs)
4. ⬜ Seed `provider_services` rows for `paysprint` × `dmt`/`aeps`, `is_primary=false`, sandbox stage
5. ⬜ Manual test each AEPS method against PaySprint UAT with real sandbox creds (ask user for `.env` values — never commit them) — **do this before ever setting `AEPS_PROVIDER_MODE=paysprint_sandbox`**

## Known gaps until PaySprint confirms (do not treat as done)
- UAT base URL (`PAYSPRINT_UAT_BASE_URL` must be set manually — no default)
- AES mode/padding (defaulted to AES-128-CBC, unconfirmed)
- ✅ JWT timestamp unit — confirmed **seconds** (2026-07-21, PaySprint Authentication doc prose: "Timestamp is in seconds ... valid for <=5 minutes"); `PAYSPRINT_JWT_TIMESTAMP_UNIT` now defaults to `"s"`
- Which bank-pipe (Bank1/3/4/5/6) this merchant is onboarded on — adapter defaults to generic Bank4-style `/aeps/v3/.../index` paths, may need to switch to a bank-specific pipe
- Exact request/response field names — docs mark these "confirm" (OpenAPI-polluted); adapter uses best-effort names (`aadhaar`, `bankiin`, `piddata`, `referenceid`)

## Test
```bash
# after adapter wired, sandbox mode:
curl -s -H "Authorization: Bearer <retailer_jwt>" http://localhost:4000/api/txn/dmt/banks
```

## Done when
- [ ] `PaySprintAdapter` implements AEPS methods, tested against UAT
- [ ] `PaySprintAdapter` implements DMT methods (incl. account-opening chain), tested against UAT
- [ ] `provider_services` seeded, PaySprint selectable as non-primary provider for DMT/AEPS
- [ ] No BBPS/Recharge/other PaySprint rails touched

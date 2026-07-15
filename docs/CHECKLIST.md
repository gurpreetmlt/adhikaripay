# Project Checklist

> Update jab task complete ho — agent ko poora history padhne ki zaroorat nahi.

## Infrastructure
- [x] Postgres + Mongo local
- [x] Backend :4000
- [x] Admin :3000, Agent web :3001
- [x] Portal login guard
- [x] LOGIN.md + task system
- [ ] VPS live API
- [ ] Production env

## Web
- [x] Admin login + dashboard (basic)
- [x] Agent single login + role dashboard
- [x] Admin full stats dashboard
- [x] KYC queue UI
- [ ] Commission scheme builder (role defaults)
- [x] Per-agent service commission overrides (admin agent detail)
- [x] Wallet page shows Pending balance (Wallet 1 / Wallet 2)

## Mobile
- [x] RN Android shell + login (OTP flow)
- [x] Role-based home screen
- [x] Bottom tab navigation (Retailer 4 tabs, Partner 3 tabs)
- [ ] Service flows (AEPS, DMT, BBPS)
- [ ] Biometric SDK
- [x] Txn PIN modal + wallet transfer PIN
- [x] Wallet screen Pending balance line

## Backend API
- [x] Auth, wallet, catalog, txn stubs
- [x] Txn PIN on wallet transfer
- [x] Wallet `pendingBalance` on `/wallet/me` (from pending/initiated txns)
- [ ] Fund request approve flow
- [ ] KYC CRUD routes
- [ ] Commission payout report

## Last updated
2026-07-14 — Wallet pending balance: `GET /api/wallet/me` adds `pendingBalance` per wallet (sum of pending/initiated txns); agent web Wallet + mobile Wallet show Pending
2026-07-14 — Branding: product = Adhikari Pay; npm scopes `@adhikaripay/*`; folder renamed to `apps/mobile` (Android applicationId `com.lokalpaymobile` kept for Play Store continuity)
2026-07-14 — Empty Retailer txns: migrate 0005 blocked by non-idempotent 0004; seed now funds Wallet 1/2 + logs userId
2026-07-14 — `seed:txns` dummy retailer txns (Wallet 1/2) for agent Transactions page
2026-07-14 — Retailer Wallet 1/2 balances in agent header; txn `wallet_type` column shows which wallet was cut
2026-07-14 — Login MPIN: journaled `0004_login_mpin` so migrate adds `login_mpin_hash` (OTP/MPIN 500s)
2026-07-14 — Per-agent service commission on agent detail + `user_commission_rates`
2026-07-14 — Admin web feature pages (stats, users, KYC, txns, site-control, wallet, passbook)
2026-07-14 — Admin Adhikari Pay-style shell (blue+green); fixed user `admin` / no OTP

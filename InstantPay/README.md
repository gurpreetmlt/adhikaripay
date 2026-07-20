# InstantPay Integration Docs

Adhikari Pay ke InstantPay (Financial Inclusion) integrations ka single source of truth. Kisi bhi agent/chat me InstantPay pe kaam shuru karne se pehle relevant doc padho.

## Convention (zaroori)

> **Jo bhi InstantPay service implement karein, uska ek doc isi `InstantPay/` folder me `AEPS.md` jaisa complete detail ke saath banao/update karo.** Har doc me: architecture, service-wise status table, per-service details, compliance, env vars, provider se kya chahiye, pending, key files, testing cheat-sheet.

## Docs index

| Doc | Service | Status |
|-----|---------|--------|
| [`OVERVIEW.md`](OVERVIEW.md) | Platform overview (offerings + API basics) | Reference only |
| [`ONBOARDING.md`](ONBOARDING.md) | Merchant/outlet onboarding (eKYC) | Backend done, UI pending |
| [`AEPS.md`](AEPS.md) | Aadhaar Enabled Payment System | Live-ready (backend) |
| [`DMT.md`](DMT.md) | Remittance / Domestic Money Transfer | 🚧 In progress (backend + agent web) |
| [`NEPAL.md`](NEPAL.md) | Remittance (Nepal) | 🚧 In progress (static data wired) |
| [`ASSET_VERIFICATION.md`](ASSET_VERIFICATION.md) | Identity — Asset Verification (UAN, …) | 📄 Docs only |

Naya rail (BBPS, Recharge, Payout, etc.) implement karte waqt: naya `<SERVICE>.md` banao aur upar table me add karo. Raw InstantPay doc pages paste hone pe pehle reference doc save karo, phir implement.

# Roadmap — Phased (har phase alag Cursor chat)

> XL task ek chat mein mat daalo. Har row = 1 ya multiple task files.

## Phase 0 — Done ✅
- [x] Monorepo, backend API, Postgres + Mongo
- [x] Admin web (:3000), Agent web (:3001)
- [x] Single login + portal guard
- [x] RN Android shell, role-based home
- [x] Task system + LOGIN.md

## Phase 1 — Core money (priority)
| Task file | Work | Size |
|-----------|------|------|
| [12-wallet-ledger.md](TASKS/12-wallet-ledger.md) | Fund transfer audit, txn PIN on wallet | M |
| [13-fund-management.md](TASKS/13-fund-management.md) | Admin load float, approve requests | M |

## Phase 2 — Retailer services
| Task file | Work | Size |
|-----------|------|------|
| [09-retailer-aeps.md](TASKS/09-retailer-aeps.md) | AEPS withdraw, balance, mini stmt | L → split |
| [10-retailer-dmt.md](TASKS/10-retailer-dmt.md) | Beneficiary + transfer | L |
| [14-retailer-bbps-recharge.md](TASKS/14-retailer-bbps-recharge.md) | Bill pay + recharge | M |

## Phase 3 — Mobile polish
| Task file | Work | Size |
|-----------|------|------|
| [11-mobile-bottom-tabs.md](TASKS/11-mobile-bottom-tabs.md) | Tabs: Services, History, Wallet, Account | M |
| [15-mobile-biometric.md](TASKS/15-mobile-biometric.md) | Mantra/Morpho native module | L |
| [16-mobile-txn-pin.md](TASKS/16-mobile-txn-pin.md) | PIN modal before every txn | S |

## Phase 4 — Admin & network
| Task file | Work | Size |
|-----------|------|------|
| [17-admin-dashboard.md](TASKS/17-admin-dashboard.md) | GMV stats, pending KYC count | M |
| [18-kyc-module.md](TASKS/18-kyc-module.md) | KYC queue, Sales Agent mobile | L |
| [19-commission-schemes.md](TASKS/19-commission-schemes.md) | Slab CRUD + calculator | M |

## Phase 5 — Production
| Task file | Work | Size |
|-----------|------|------|
| [08-vps-deploy.md](TASKS/08-vps-deploy.md) | API live on VPS | M |
| [20-production-env.md](TASKS/20-production-env.md) | Secrets, CORS, SSL, mobile API URL | S |

---

## Suggested order (fast value)
```
11-mobile-bottom-tabs → 09-retailer-aeps → 12-wallet-ledger → 08-vps-deploy
```

## Chat budget guide (approx)
- **~20–30 small (S) tasks** / month comfortably
- **~10 medium (M)** OR **~3 large (L)** — mix wisely
- **1 XL = 5–8 chats** after split

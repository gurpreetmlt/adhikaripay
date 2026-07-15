# Task 11 — Mobile Bottom Tabs

## Size: M

## Goal
Tabs: Services | History | Wallet | Account (retailer). Partner roles: Dashboard | Passbook | Account.

## Read ONLY
| Path | Why |
|------|-----|
| `apps/mobile/src/navigation/RootNavigator.tsx` | Current nav |
| `apps/mobile/package.json` | Add @react-navigation if needed |
| `apps/mobile/App.tsx` | Entry |

## Steps
1. Add `@react-navigation/bottom-tabs` (RN 0.76 compatible version)
2. Role-based tab config
3. Move RoleHomeScreens into tab screens

## Do NOT
- Read entire android/ unless native issue
- Rewrite web app

## Test
`npm run android` — login retailer → 4 tabs visible

## Done when
- [x] Retailer 4 tabs work
- [x] Super dist / dist get partner tabs

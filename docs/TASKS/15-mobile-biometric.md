# Task 15 — Mobile Biometric (Android)

## Size: L — split: (1) Kotlin stub (2) RN bridge (3) AEPS wire

## Read ONLY
| Path | Why |
|------|-----|
| `apps/mobile/android/app/src/main/` | Native code |
| `apps/mobile/android/app/build.gradle` | Deps |
| `docs/TASKS/09-retailer-aeps.md` | AEPS flow |

## Goal
`captureFingerprint()` interface — mock first, Mantra/Morpho AAR later

## Do NOT
- Read ios/ (removed)
- Change backend auth

## Done when
- [ ] Native module callable from RN
- [ ] Mock returns PID data
- [ ] AEPS form calls capture before submit

# Architecture

## Overview

Daily Expense Tracker is a **local-first, offline personal finance app** with two front ends — a React web app and a React Native mobile app (iOS + Android) — that share one logic layer. There is no backend, no API, and no account system: every screen reads and writes encrypted data that lives entirely on the user's own device.

## Summary

- **Two UIs, one brain.** `shared.js` is byte-identical on both platforms and holds every piece of logic that doesn't touch the UI or a platform API: calendar math, currency formatting, recurring-expense generation, backup validation, PIN rules.
- **No server, anywhere.** Both apps talk directly to platform storage (`AsyncStorage` on mobile, `localStorage`/`IndexedDB` on web) — never to a network API.
- **Encrypted at rest, on-device.** A device-held key (Keychain/Keystore on mobile, a non-extractable browser key on web) encrypts everything before it's written to disk.
- **Encrypted separately in transit-out.** Backup exports use a second, independent layer of encryption (password-based) since a backup file is meant to leave the device.
- **Tested where it matters most.** The shared logic layer has a real unit test suite; a Playwright smoke suite exercises the actual UI; both run in CI on every push.

## Tools & tech stack

| Layer | Web | Mobile |
|---|---|---|
| UI framework | React 18 | React Native 0.74 |
| Build tool | Vite 5 | Metro (via React Native CLI) |
| Charts | Recharts | (custom lightweight bars/progress views) |
| Spreadsheet export | `xlsx` (SheetJS) | `xlsx` (SheetJS) |
| File I/O | Browser download/`<input type=file>` | `react-native-fs` + `react-native-share` |
| At-rest encryption | Web Crypto API (AES-GCM, non-extractable key) | `crypto-js` (AES) + `react-native-keychain` (key storage) |
| Backup encryption | Web Crypto API (PBKDF2 + AES-GCM) | `crypto-js` (PBKDF2 + AES-CBC) |
| Local persistence | `localStorage` + `IndexedDB` (for the key) | `@react-native-async-storage/async-storage` |
| Biometric unlock | — (PIN only) | `react-native-keychain` (Face ID / fingerprint) |
| Unit testing | Vitest | Jest |
| E2E testing | Playwright | *(planned: Detox — not yet implemented)* |
| Linting | ESLint + Prettier | ESLint (React + Hooks) + Prettier |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | same workflow, separate job |
| Web hosting target | Vercel (`vercel.json` present) | App Store / Play Store (native build) |

## Architecture & file structure

```text
dailyExpenseTracker/
├── package.json              # ⚠ web app's package.json — lives at repo ROOT, not in web/
├── vite.config.js            # points Vite at web/ as its root, outputs to ../dist
├── vercel.json                # Vercel deployment config for the web build
├── playwright.config.js      # E2E config; auto-starts the Vite dev server for tests
│
├── web/
│   ├── index.html            # Vite entry HTML
│   └── src/
│       ├── main.jsx          # entire web UI: all screens/components + top-level state
│       ├── shared.js         # ← same file as mobile/shared.js, kept in sync manually
│       ├── secureStorage.js  # web-only: Web Crypto key mgmt + encrypt/decrypt wrappers
│       ├── backupCrypto.js   # web-only: password-based backup file encryption
│       ├── style.css         # all styling, CSS-variable-based (powers dark mode)
│       └── __tests__/        # Vitest suite (imports shared.js)
│
├── mobile/
│   ├── App.js                # entire mobile UI: all screens/components + top-level state
│   ├── shared.js             # ← same file as web/src/shared.js, kept in sync manually
│   ├── secureStorage.js      # mobile-only: Keychain/Keystore key mgmt + encrypt/decrypt
│   ├── backupCrypto.js       # mobile-only: password-based backup file encryption
│   ├── appLock.js            # mobile-only: biometric (Face ID/fingerprint) unlock helpers
│   ├── android/ , ios/       # native project files (generated + customized app icon)
│   └── __tests__/            # Jest suite (imports shared.js)
│
├── e2e/smoke.spec.js         # Playwright: dashboard, add-expense, calendar, app-lock flows
├── docs/
│   ├── PRIVACY_POLICY.md
│   └── ARCHITECTURE.md       # this file
└── .github/workflows/ci.yml  # runs web build+tests, mobile tests+lint, and E2E on push
```

### Why `shared.js` is duplicated, not imported

Mobile and web are two separate build systems (Metro vs. Vite) with no shared package/workspace linking them. Rather than set up a monorepo tooling layer for one file, `shared.js` is kept as two copies that must be updated together. Anything platform-specific (actual encryption calls, file I/O, biometric prompts) lives in its own per-platform file instead, so the *only* file requiring manual sync is the pure-logic one — which is also the one covered by unit tests on both sides, so a sync drift would likely surface as a test failure on whichever side is behind.

### Data flow, end to end

1. **App start** → `secureStorage`/`secureGetItem` decrypts each stored key (`expenses`, `categories`, `budget`, `categoryBudgets`, `recurring`, `profile`, `appLock`, `theme`) using the device-held key.
2. **Recurring catch-up** → `generateDueExpenses()` (shared.js) runs once against the loaded `recurring` templates and today's date, inserting any missed occurrences before the UI renders.
3. **Every state change** → a `useEffect` per data slice re-encrypts and writes that slice back to storage — nothing is held in memory only.
4. **Backup export** → `buildBackupPayload()` (shared.js) serializes everything to plain JSON, then the platform's `backupCrypto.js` encrypts that JSON with a user-chosen password before it's written to a file/download.
5. **Backup restore** → the reverse: `isEncryptedBackupText()` detects the envelope, `backupCrypto.js` decrypts it (or it's used as-is if it's a legacy unencrypted backup), then `parseBackupPayload()` validates the shape before anything overwrites current state.

## Security model, in one paragraph

Two independent encryption layers exist for two different threats: **at-rest encryption** (device-held key, invisible to the user) protects data sitting on the device from anything reading the app's storage files directly; **backup encryption** (user-chosen password) protects a backup file *after* it's deliberately moved off the device. Neither layer protects against a compromised device actively running code inside the app's own process — that's outside what client-side encryption can promise, and isn't a threat this app claims to defend against.

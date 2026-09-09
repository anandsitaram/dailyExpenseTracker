# Privacy Policy — Daily Expense Tracker

_Last updated: September 2026_

## The short version

Daily Expense Tracker does not have a server, an account system, or any analytics or advertising. Every expense, budget, category, and profile detail you enter stays **encrypted, on your own device**. Nothing is ever transmitted anywhere. We (the developer) cannot see your data, because there is nowhere for it to go — there is no backend to send it to.

## What data the app stores

- Expenses, income entries, and categories you create
- Budgets (overall and per-category)
- Recurring expense templates
- Basic profile details you choose to enter (first/last name, nickname, email, avatar) — entirely optional and used only to personalize the dashboard greeting
- An app-lock PIN, if you choose to set one
- Your appearance (light/dark) preference

None of this is required to be accurate or real — the profile fields in particular are for your own personalization only and are never verified or transmitted.

## Where it's stored

- **Mobile app:** encrypted with a key held in your device's Keychain (iOS) or Keystore (Android), with the encrypted data itself in local app storage (`AsyncStorage`).
- **Web app:** encrypted with a non-extractable key generated in your browser and kept in `IndexedDB`, with the encrypted data itself in `localStorage`.

In both cases, the encryption key never leaves your device and is not accessible to the developer, to Daily Expense Tracker's code running remotely (there is none), or to any third party.

## Backups

If you use the app's Backup & Restore feature, it creates a file containing your data, protected with a password you choose. That file is saved wherever you choose to save it (your device's file system, a cloud drive you control, etc.) — the app itself never uploads it anywhere. The backup password is never stored by the app; if you lose it, the backup cannot be recovered by us or anyone else.

## What we don't do

- We don't collect analytics, crash reports, or usage statistics.
- We don't show ads or use ad networks.
- We don't share, sell, or transmit your data to any third party — we have no mechanism to do so.
- We don't require or use any account, login, or personal identifier.

## Permissions the app may request

- **Biometric/Face ID/fingerprint** (mobile, optional): used only to unlock the app locally; verification happens entirely on-device via the OS and is never sent anywhere.
- **File/storage access** (for exporting/importing backups or Excel/CSV files): used only to save or read files you explicitly choose to export or import.

## Children's privacy

The app does not knowingly collect data from anyone, since it does not collect data at all in the traditional (transmitted/stored-remotely) sense. It is not directed at children specifically, but it also doesn't require any age-gated functionality.

## Changes to this policy

If this policy changes, the updated version will be included in the app's repository and dated above.

## Contact

For questions about this policy or the app, please use the contact details listed on the app's store listing or repository.
